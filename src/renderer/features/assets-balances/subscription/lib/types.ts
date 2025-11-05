import { type Chain, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type SubscriptionKey = `${AccountId} ${ChainId}`;

export type Subscriptions = Record<SubscriptionKey, VoidFunction>;

export type RequestedAccount = {
  accountId: AccountId;
  chain: Chain;
};
