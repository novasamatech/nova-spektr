import type { Account_NEW, Address, Unlocking } from '@shared/core';

export type NominatorInfo<T extends Account_NEW> = {
  address: Address;
  isSelected: boolean;
  stash?: Address;
  account: T;
  totalReward?: string;
  totalStake?: string;
  unlocking?: Unlocking[];
};

export const enum ControllerTypes {
  STASH = 'stash',
  CONTROLLER = 'controller',
}

export const enum Operations {
  BOND_NOMINATE = 'bond_nominate',
  BOND_EXTRA = 'bond_extra',
  UNSTAKE = 'unstake',
  RESTAKE = 'restake',
  NOMINATE = 'nominate',
  WITHDRAW = 'withdraw',
  SET_PAYEE = 'set_payee',
}
