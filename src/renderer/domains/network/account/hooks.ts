import { type Chain, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';

import {
  type AccountNameParams,
  accountNameResource,
  createAccountNameCacheKey,
  createWalletNameCacheKey as getWalletKey,
  walletsNameResource,
} from './resource';

type UseAccountNameParams = {
  accountId: AccountId | null | undefined;
  chain?: Chain | null;
  title?: string;
};

export const useAccountName = ({ accountId, chain, title }: UseAccountNameParams) => {
  const params: AccountNameParams | null = accountId ? { accountId, chain, title } : null;
  const { data } = useResource(accountNameResource, {
    params,
    defaultValue: undefined,
    map: (cache, params) => {
      return cache[createAccountNameCacheKey(params)] ?? '';
    },
  });

  return data;
};

export const useWalletName = (wallet: Wallet | null | undefined) => {
  if (!wallet) {
    return null;
  }

  const resolvedWallets = useWalletsName([wallet]);

  return resolvedWallets[0]?.name ?? wallet.name;
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
