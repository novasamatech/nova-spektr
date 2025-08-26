import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type ChainId } from './general';

export type Stake = {
  accountId: AccountId;
  chainId: ChainId;
  controller: AccountId;
  stash: AccountId;
  active: string;
  total: string;
  unlocking: Unlocking[];
};

export type Unlocking = {
  value: string;
  era: string;
};

export const enum RewardsDestination {
  RESTAKE = 'restake',
  TRANSFERABLE = 'transferable',
}
