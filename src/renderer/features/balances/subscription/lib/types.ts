import { VoidFn } from '@polkadot/api/types';

import type { ID, ChainId, AccountId } from '@shared/core';

export type Subscriptions = {
  [chainId: ChainId]: { [walletId: ID]: [VoidFn, VoidFn] } | undefined;
};

export type SubAccounts = {
  [chainId: ChainId]: {
    [walletId: ID]: AccountId[];
  };
};
