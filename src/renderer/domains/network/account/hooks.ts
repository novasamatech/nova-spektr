import { useMemo } from 'react';

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
  /**
   * Used only when the account resolves to nothing better than its stored name
   * or short address — see accountService.resolveAccountName.
   */
  fallbackName?: string;
};

export const useAccountsNames = (accounts: AnyAccount[], chain?: Chain | null) => {
  const { data: accountNames } = useResource(accountsNameResource, {
    params: accounts.length === 0 ? null : { accounts, chain },
    defaultValue: {},
    map: (cache, { accounts, chain }) => {
      const result: Record<string, string> = {};
      for (const account of accounts) {
        const key = createAccountNameCacheKey({
          accountId: account.accountId,
          chain,
          account,
        });
        result[key] = cache[key] ?? account.name;
      }
      return result;
    },
  });

  return accounts.map(account => {
    const key = createAccountNameCacheKey({
      accountId: account.accountId,
      chain,
      account,
    });
    const resolvedName = accountNames[key];
    return resolvedName ? { ...account, name: resolvedName } : account;
  });
};

export const useAccountName = ({ accountId, chain, title, fallbackName }: UseAccountNameParams) => {
  const params: AccountNameParams | null = accountId ? { accountId, chain, title, fallbackName } : null;
  const { data } = useResource(accountNameResource, {
    params,
    defaultValue: undefined,
    map: (cache, params) => {
      return cache[createAccountNameCacheKey(params)] ?? '';
    },
  });

  return data;
};

export const useWalletsNames = (wallets: Wallet[]) => {
  const isEmpty = nullable(wallets) || wallets.length === 0;

  const { data: walletNames } = useResource(walletsNameResource, {
    params: isEmpty ? null : { wallets },
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

  if (isEmpty) return [];

  return wallets.map(wallet => {
    const key = getWalletKey({ wallet });
    const resolvedName = walletNames[key];
    return resolvedName ? { ...wallet, name: resolvedName } : wallet;
  });
};

export const useWalletName = (wallet: Wallet | null | undefined) => {
  const wallets = useMemo(() => (wallet ? [wallet] : []), [wallet?.id, wallet?.name]);
  const resolvedWallets = useWalletsNames(wallets);

  if (!wallet) return null;

  return resolvedWallets[0]?.name ?? wallet.name;
};
