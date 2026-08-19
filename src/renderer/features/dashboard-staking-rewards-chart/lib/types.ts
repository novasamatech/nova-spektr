import { type ChainId } from '@/shared/core';

/** Time window the user picks with the range chips. */
export type RangeKey = '7d' | '30d' | '90d' | '1y';

/** Width of a single bar. Derived from the range, never chosen by the user. */
export type BucketGranularity = 'day' | 'week' | 'month';

/**
 * The shape of a reward record this feature needs — a subset of the domain's
 * `MonthlyRewardRecord`, restated so the pure bucketing code has no dependency
 * on the data layer. `timestamp` is unix **seconds**, `amount` is planck.
 */
export type RewardRecordLike = {
  address: string;
  amount: string;
  timestamp: number;
};

/** One account's slice of a bucket. */
export type AccountShare = {
  accountId: string;
  /** Planck. */
  amount: string;
  /** Fraction of the bucket total, `0..1`. */
  share: number;
};

export type RewardBucket = {
  /** Inclusive start of the bucket, unix ms. */
  start: number;
  /** Exclusive end of the bucket, unix ms. */
  end: number;
  granularity: BucketGranularity;
  /** Planck sum of every reward that landed inside the bucket. */
  total: string;
  /** Contributing accounts, largest first. Empty for an empty bucket. */
  accounts: AccountShare[];
};

/** A staking asset the chart can be switched to. */
export type RewardAssetOption = {
  chainId: ChainId;
  symbol: string;
  color: string;
};
