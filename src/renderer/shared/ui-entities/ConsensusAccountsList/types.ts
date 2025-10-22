import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type ChainAccountPair = readonly [chain: Chain, accountId: AccountId];
