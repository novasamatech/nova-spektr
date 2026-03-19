import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { UnlockChunkType } from '@/shared/api/governance';
import { type ChainId, type VotingMap } from '@/shared/core';
import { getCurrentBlockNumber, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useReferendums, useTracks, useUndecidingTimeout, useVoting } from '@/domains/governance';
import { claimScheduleService, governanceService, votingService } from '@/entities/governance';
import { networkModel, useApi } from '@/entities/network';

const BN_ZERO = new BN(0);
const EMPTY_TRACK_LOCKS: Record<AccountId, Record<string, BN>> = {};

export type ChainGovernanceData = {
  activeVotingAccounts: number;
  totalLocked: string;
  claimableAmount: string;
  averageConviction: number;
  chainName: string;
  symbol: string;
  precision: number;
  icon: { monochrome: string; colored: string };
  priceId: string;
  pending: boolean;
};

export const useChainGovernanceData = (chainId: ChainId, accountIds: string[]) => {
  const chains = useUnit(networkModel.$chains);
  const api = useApi(chainId);

  // Stabilize typedAccountIds — only recompute when the serialized value changes,
  // not on every new array reference from the parent.
  const accountIdsKey = accountIds.join(',');
  const typedAccountIds = useMemo(() => accountIds.map((id) => toAccountId(id)), [accountIdsKey]);

  const { data: tracks, pending: tracksPending } = useTracks({ api });
  const trackIds = useMemo(() => Object.keys(tracks), [tracks]);

  const { data: rawVotingMap, pending: votingPending } = useVoting({
    api,
    tracks: trackIds,
    accounts: typedAccountIds,
  });

  // Filter voting map to only include currently selected accounts.
  // The subscription cache may retain data from previously selected accounts.
  const votingMap = useMemo(() => {
    const accountSet = new Set<string>(typedAccountIds.map(String));
    const filtered: VotingMap = {};

    for (const [accountId, trackVoting] of Object.entries(rawVotingMap)) {
      if (accountSet.has(accountId)) {
        filtered[accountId as AccountId] = trackVoting;
      }
    }

    return filtered;
  }, [rawVotingMap, typedAccountIds]);

  const { data: referendums, pending: referendumsPending } = useReferendums({ api });
  const { data: undecidingTimeout } = useUndecidingTimeout({ api });

  const [trackLocks, setTrackLocks] = useState<Record<AccountId, Record<string, BN>>>(EMPTY_TRACK_LOCKS);
  const [claimableAmount, setClaimableAmount] = useState(BN_ZERO);
  const [claimsPending, setClaimsPending] = useState(false);

  // Fetch track locks
  useEffect(() => {
    if (!api || typedAccountIds.length === 0) {
      setTrackLocks(EMPTY_TRACK_LOCKS);

      return;
    }

    let cancelled = false;

    governanceService
      .getTrackLocks(api, typedAccountIds)
      .then((locks) => {
        if (!cancelled) {
          setTrackLocks(locks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTrackLocks(EMPTY_TRACK_LOCKS);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, typedAccountIds]);

  // Calculate claimable amount
  useEffect(() => {
    if (
      !api ||
      typedAccountIds.length === 0 ||
      Object.keys(votingMap).length === 0 ||
      referendums.length === 0 ||
      Object.keys(tracks).length === 0
    ) {
      setClaimableAmount(BN_ZERO);

      return;
    }

    let cancelled = false;
    setClaimsPending(true);

    const calculate = async () => {
      const currentBlockNumber = await getCurrentBlockNumber(api);
      const voteLockingPeriod = api.consts.convictionVoting.voteLockingPeriod.toNumber();

      let totalClaimable = new BN(0);

      for (const accountId of typedAccountIds) {
        const votingByTrack = votingMap[accountId];
        if (!votingByTrack) continue;

        const accountTrackLocks = trackLocks[accountId] ?? {};

        const schedule = claimScheduleService.estimateClaimSchedule({
          currentBlockNumber,
          referendums,
          tracks,
          trackLocks: accountTrackLocks,
          votingByTrack,
          undecidingTimeout,
          voteLockingPeriod,
        });

        for (const chunk of schedule) {
          if (chunk.type === UnlockChunkType.CLAIMABLE && !chunk.amount.isZero()) {
            totalClaimable = totalClaimable.add(chunk.amount);
          }
        }
      }

      if (!cancelled) {
        setClaimableAmount(totalClaimable);
        setClaimsPending(false);
      }
    };

    calculate().catch(() => {
      if (!cancelled) {
        setClaimsPending(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [api, typedAccountIds, votingMap, referendums, tracks, trackLocks, undecidingTimeout]);

  // Compute stats from voting map
  const stats = useMemo(() => {
    let activeVotingAccounts = 0;
    let totalLocked = new BN(0);
    const multipliers: number[] = [];

    for (const [, trackVoting] of Object.entries(votingMap)) {
      let accountMaxLock = new BN(0);
      let hasActivity = false;

      for (const [, voting] of Object.entries(trackVoting)) {
        if (votingService.isCasting(voting)) {
          const voteEntries = Object.values(voting.votes);
          if (voteEntries.length > 0) {
            hasActivity = true;
          }

          for (const vote of voteEntries) {
            const amount = votingService.calculateAccountVoteAmount(vote);
            if (amount.gt(accountMaxLock)) {
              accountMaxLock = amount;
            }
            const conviction = votingService.getAccountVoteConviction(vote);
            multipliers.push(votingService.getConvictionMultiplier(conviction));
          }

          if (voting.prior && voting.prior.amount && !voting.prior.amount.isZero()) {
            hasActivity = true;
            if (voting.prior.amount.gt(accountMaxLock)) {
              accountMaxLock = voting.prior.amount;
            }
          }
        } else if (votingService.isDelegating(voting)) {
          hasActivity = true;
          if (voting.balance.gt(accountMaxLock)) {
            accountMaxLock = voting.balance;
          }
          if (voting.prior && voting.prior.amount && voting.prior.amount.gt(accountMaxLock)) {
            accountMaxLock = voting.prior.amount;
          }
          multipliers.push(votingService.getConvictionMultiplier(voting.conviction));
        }
      }

      if (hasActivity) {
        activeVotingAccounts++;
      }
      totalLocked = totalLocked.add(accountMaxLock);
    }

    const averageConviction = multipliers.length > 0 ? multipliers.reduce((a, b) => a + b, 0) / multipliers.length : 0;

    return { activeVotingAccounts, totalLocked, averageConviction };
  }, [votingMap]);

  // Chain metadata
  const chain = chains[chainId];
  const asset = chain ? votingService.getVotingAsset(chain) : null;
  const pending = accountIds.length > 0 && (tracksPending || votingPending || referendumsPending || claimsPending);
  const totalLockedStr = stats.totalLocked.toString();
  const claimableStr = claimableAmount.toString();

  if (!chain || !asset?.priceId) {
    return null;
  }

  return {
    activeVotingAccounts: stats.activeVotingAccounts,
    totalLocked: totalLockedStr,
    claimableAmount: claimableStr,
    averageConviction: stats.averageConviction,
    chainName: chain.name,
    symbol: asset.symbol,
    precision: asset.precision,
    icon: asset.icon,
    priceId: asset.priceId,
    pending,
  } satisfies ChainGovernanceData;
};
