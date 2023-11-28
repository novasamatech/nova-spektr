import { Account, Address, Unlocking } from '@/src/renderer/shared/core';

export type NominatorInfo<T = Account> = {
  address: Address;
  isSelected: boolean;
  stash?: Address;
  account: T;
  totalReward?: string;
  totalStake?: string;
  unlocking?: Unlocking[];
};
