import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Chain } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { useMonthlyRewards } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { buildBuckets, getRangeTotal, hasRewards } from '../lib/buckets';
import { type RangeKey, type RewardBucket } from '../lib/types';

type Params = {
  accountIds: string[];
  chain: Chain | null;
  range: RangeKey;
};

type Result = {
  buckets: RewardBucket[];
  /** Planck total of the whole range. */
  total: string;
  hasData: boolean;
  pending: boolean;
};

export const useRewardsChart = ({ accountIds, chain, range }: Params): Result => {
  const chains = useUnit(networkModel.$chains);

  const typedAccountIds = useMemo(() => accountIds.map((id) => toAccountId(id)), [accountIds]);

  // One year of raw payout records, reused by every range — switching chips is
  // a re-bucketing, not a refetch.
  const { data: records, pending } = useMonthlyRewards(typedAccountIds, chain, chains);

  const buckets = useMemo(() => {
    // SS58 decoding is the expensive part of bucketing; the same handful of
    // addresses repeat across thousands of records.
    const cache = new Map<string, string>();
    const resolveAccountId = (address: string): string => {
      const cached = cache.get(address);
      if (cached) return cached;

      const accountId = toAccountId(address);
      cache.set(address, accountId);

      return accountId;
    };

    return buildBuckets({ records, range, nowMs: Date.now(), resolveAccountId });
  }, [records, range]);

  return {
    buckets,
    total: useMemo(() => getRangeTotal(buckets), [buckets]),
    hasData: useMemo(() => hasRewards(buckets), [buckets]),
    pending: accountIds.length > 0 && pending,
  };
};
