import { type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';

import {
  type AccountNameParams,
  type WalletNameParams,
  accountNameResource,
  createAccountNameCacheKey,
  createWalletNameCacheKey,
  walletNameResource,
} from './resource';

type UseAccountNameParams = {
  accountId: AccountId | null | undefined;
  chain?: Chain | null;
  title?: string;
};

export const useAccountName = ({ accountId, chain, title }: UseAccountNameParams): string => {
  const params: AccountNameParams | null = accountId ? { accountId, chain, title } : null;
  const { data } = useResource(accountNameResource, {
    params,
    defaultValue: '',
    map: (cache, params) => {
      return cache[createAccountNameCacheKey(params)] ?? '';
    },
  });

  return data;
};

export const useWalletName = (wallet: Wallet | null | undefined): string => {
  const params: WalletNameParams | null = wallet ? { wallet } : null;
  const { data } = useResource(walletNameResource, {
    params,
    defaultValue: '',
    map: (cache, params) => {
      return cache[createWalletNameCacheKey(params)] ?? '';
    },
  });

  return data;
};
