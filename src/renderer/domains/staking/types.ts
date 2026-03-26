import { type Stake, type Validator } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type StakingMap = Record<AccountId, Stake | undefined>;
export type ValidatorMap = Record<AccountId, Validator>;
export type RewardsMap = Record<AccountId, string>;

export type Payee = 'Stash' | 'Staked' | 'Controller' | { Account: string };
export type ApyValidator = Pick<Validator, 'accountId' | 'totalStake' | 'commission'>;

export type RewardSource = {
  url: string;
  addressPrefix: number;
};

export type MonthlyRewardRecord = {
  address: string;
  amount: string;
  timestamp: number;
};
