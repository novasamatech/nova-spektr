import { type Chain, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';

import {
  type AccountNameParams,
  accountNameResource,
  accountsNameResource,
  createAccountNameCacheKey,
  createWalletNameCacheKey as getWalletKey,
  walletsNameResource,
} from './resource';
import { type AnyAccount } from './types';

type UseAccountNameParams = {
  accountId: AccountId | null | undefined;
  chain?: Chain | null;
  title?: string;
  accounts?: AnyAccount[];
};

export const useAccountsName = (accounts: AnyAccount[], chain?: Chain | null) => {
  const { data: accountNames } = useResource(accountsNameResource, {
    params: nullable(accounts) || accounts.length === 0 ? null : { accounts, chain },
    defaultValue: {},
    map: (cache, { accounts, chain }) => {
      const result: Record<string, string> = {};
      for (const account of accounts) {
        const key = createAccountNameCacheKey({
          accountId: account.accountId,
          chain,
          title: undefined,
        });
        result[key] = cache[key] ?? account.name;
      }
      return result;
    },
  });

  if (nullable(accounts) || accounts.length === 0) {
    return accounts || [];
  }

  return accounts.map(account => {
    const key = createAccountNameCacheKey({
      accountId: account.accountId,
      chain,
      title: undefined,
    });
    const resolvedName = accountNames[key];
    return resolvedName ? { ...account, name: resolvedName } : account;
  });
};

export const useAccountName = ({ accountId, chain, title, accounts: externalAccounts }: UseAccountNameParams) => {
  if (!accountId) {
    return title;
  }

  const account =
    externalAccounts?.length && accountId ? (externalAccounts.find(a => a.accountId === accountId) ?? null) : null;

  if (account) {
    const resolvedAccounts = useAccountsName([account], chain);
    const resolvedAccount = resolvedAccounts.at(0);

    return resolvedAccount?.name ?? account.name ?? title ?? '';
  }

  const params: AccountNameParams = { accountId, chain, title };
  const { data } = useResource(accountNameResource, {
    params,
    defaultValue: title,
    map: (cache, params) => cache[createAccountNameCacheKey(params)] ?? title ?? '',
  });

  return data;
};

export const useWalletsName = (wallets: Wallet[]) => {
  const { data: walletNames } = useResource(walletsNameResource, {
    params: nullable(wallets) || wallets.length === 0 ? null : { wallets },
    defaultValue: {},
    map: (cache, { wallets }) => {
      const result: Record<string, string> = {};
      for (const wallet of wallets) {
        const key = getWalletKey({ wallet });
        result[key] = cache[key] ?? wallet.name;
      }
      return result;
    },
  });

  if (nullable(wallets) || wallets.length === 0) {
    return wallets || [];
  }

  return wallets.map(wallet => {
    const key = getWalletKey({ wallet });
    const resolvedName = walletNames[key];
    return resolvedName ? { ...wallet, name: resolvedName } : wallet;
  });
};

export const useWalletName = (wallet: Wallet | null | undefined) => {
  if (!wallet) {
    return null;
  }

  const resolvedWallets = useWalletsName([wallet]);

  return resolvedWallets[0]?.name ?? wallet.name;
};
