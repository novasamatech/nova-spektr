import { type Stake, type Validator } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type DataCompleteness } from './completeness';

export type StakingMap = Record<AccountId, Stake | undefined>;
export type ValidatorMap = Record<AccountId, Validator>;
export type RewardsMap = Record<AccountId, string>;

/**
 * Reward totals per account, and how far they can be trusted: a `partial` total
 * is a lower bound (a source did not answer), and an `unavailable` one is
 * "could not be loaded", never "earned nothing".
 */
export type StakingRewards = {
  rewards: RewardsMap;
  completeness: DataCompleteness;
};

export type Payee = 'Stash' | 'Staked' | 'Controller' | { Account: string };
export type ApyValidator = Pick<Validator, 'accountId' | 'totalStake' | 'commission'>;

export type RewardSource = {
  url: string;
  addressPrefix: number;
};

/**
 * One payout as the indexer recorded it, not an aggregate.
 *
 * `id` is the indexer's own `block-event-address` key and `blockNumber` the
 * block the payout landed in — carried through untouched so an export can be
 * reconciled against the chain. `type` separates a reward from a slash, which
 * the chart sums together but a spreadsheet must be able to tell apart.
 */
export type MonthlyRewardRecord = {
  id: string;
  address: string;
  amount: string;
  timestamp: number;
  blockNumber: number;
  type: string;
};

/**
 * The payout records of a period, and whether every source contributed its
 * share — a `partial` list is missing the rows of a source that did not
 * answer.
 */
export type MonthlyRewards = {
  records: MonthlyRewardRecord[];
  completeness: DataCompleteness;
};
