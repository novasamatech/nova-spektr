import { Account } from './account';
import type { Address, ChainId } from './general';

export type Stake = {
  address: Address;
  chainId: ChainId;
  controller: Address;
  stash: Address;
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

export type NominatorInfo<T = Account> = {
  address: Address;
  isSelected: boolean;
  stash?: Address;
  account: T;
  totalReward?: string;
  totalStake?: string;
  unlocking?: Unlocking[];
};
