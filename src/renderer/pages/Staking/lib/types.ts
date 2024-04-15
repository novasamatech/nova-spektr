import type { Account, Address, Unlocking } from '@shared/core';

export type NominatorInfo<T extends Account> = {
  address: Address;
  isSelected: boolean;
  stash?: Address;
  account: T;
  totalReward?: string;
  totalStake?: string;
  unlocking?: Unlocking[];
};
