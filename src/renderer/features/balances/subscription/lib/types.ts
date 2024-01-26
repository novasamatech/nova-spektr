import { VoidFn } from '@polkadot/api/types';

import type { ID, AccountId, ChainId } from '@shared/core';

export type Subscription = Record<ChainId, SubPayload | undefined>;

export type SubPayload = {
  [walletId: ID]: {
    accounts: AccountId[];
    unsubFn: [VoidFn, VoidFn];
  };
};

export type SubAccounts = {
  [walletId: ID]: AccountId[];
};
