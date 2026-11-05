import { type Unlocking } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type DataCompleteness } from '@/domains/staking';

export type NominatorInfo<T extends AnyAccount = AnyAccount> = {
  isSelected: boolean;
  stash?: AccountId;
  account: T;
  totalReward?: string;
  /**
   * How far `totalReward` can be trusted, `undefined` while it is loading. Only
   * `complete` makes a `'0'` mean "earned nothing".
   */
  rewardsCompleteness?: DataCompleteness;
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
