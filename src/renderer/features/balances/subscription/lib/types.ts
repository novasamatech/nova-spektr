import { type UnsubscribePromise } from '@polkadot/api/types';

import type { AccountId, ChainId, ID } from '@shared/core';

export type Subscriptions = {
  [chainId: ChainId]: { [walletId: ID]: UnsubscribePromise[] } | undefined;
};

export type SubAccounts = {
  [chainId: ChainId]: { [walletId: ID]: AccountId[] };
};
