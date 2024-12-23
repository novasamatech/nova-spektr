import { type UnsubscribePromise } from '@polkadot/api/types';

import { type ChainId, type ID } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type Subscriptions = {
  [chainId: ChainId]: { [walletId: ID]: UnsubscribePromise[] } | undefined;
};

export type SubAccounts = {
  [chainId: ChainId]: { [walletId: ID]: AccountId[] };
};
