import { type ApiPromise } from '@polkadot/api';
import { type BN, BN_ZERO } from '@polkadot/util';
import { createEffect, createStore, sample } from 'effector';

import { type ClaimTimeAt, type UnlockChunk, UnlockChunkType } from '@/shared/api/governance';
import { type Referendum, type TrackId, type TrackInfo, type TrackLocks, type VotingMap } from '@/shared/core';
import { entries, getCreatedDateFromApi, getCurrentBlockNumber, nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { claimScheduleService, referendumModel, tracksModel, votingModel } from '@/entities/governance';
import { walletSelect } from '@/aggregates/wallet-select';
import { unlockService } from '../../lib/unlockService';
import { locksModel } from '../locks';
import { networkSelectorModel } from '../networkSelector';

const $claimSchedule = createStore<UnlockChunk[] | null>(null);
const $isLoading = createStore(true);

const $claimable = $claimSchedule.map((claimSchedule) => {
  if (nullable(claimSchedule)) {
    return null;
  }

  const record: Record<AccountId, BN> = {};

  for (const claim of claimSchedule) {
    if (claim.type !== UnlockChunkType.CLAIMABLE) continue;

    const accountSum = record[claim.accountId] || BN_ZERO;
    record[claim.accountId] = accountSum.add(claim.amount);
  }

  return record;
});

const $totalUnlock = $claimSchedule.map((claimSchedule) => {
  if (nullable(claimSchedule)) {
    return BN_ZERO;
  }

  let total = BN_ZERO;

  for (const claim of claimSchedule) {
    if (claim.type !== UnlockChunkType.CLAIMABLE) continue;

    total = total.add(claim.amount);
  }

  return total;
});

type Props = {
  api: ApiPromise;
  referendums: Referendum[];
  tracks: Record<TrackId, TrackInfo>;
  trackLocks: TrackLocks;
  voting: VotingMap;
};

const getClaimScheduleFx = createEffect(
  async ({ api, referendums, tracks, trackLocks, voting }: Props): Promise<UnlockChunk[]> => {
    const currentBlockNumber = await getCurrentBlockNumber(api);
    const undecidingTimeout = api.consts.referenda.undecidingTimeout.toNumber();
    const voteLockingPeriod = api.consts.convictionVoting.voteLockingPeriod.toNumber();

    const claims = entries(trackLocks).flatMap(([accountId, trackLock]) => {
      const claimSchedule = claimScheduleService.estimateClaimSchedule({
        currentBlockNumber,
        referendums,
        tracks,
        trackLocks: trackLock,
        votingByTrack: voting[accountId],
        voteLockingPeriod,
        undecidingTimeout,
      });

      return unlockService.filterClaims(claimSchedule, accountId);
    });

    const claimsDates = claims.map((claim) => {
      if (claim.type !== UnlockChunkType.PENDING_LOCK) return claim;

      return getCreatedDateFromApi((claim.claimableAt as ClaimTimeAt).block, api).then((timeToBlock) => ({
        ...claim,
        timeToBlock,
      }));
    });

    return Promise.all(claimsDates);
  },
);

sample({
  clock: [networkSelectorModel.$network, walletSelect.$selectedWallet],
  target: [$claimSchedule.reinit],
});

sample({
  clock: [locksModel.$isLoading, votingModel.$isLoading],
  source: {
    claimSchedule: $claimSchedule,
    isLoadingLock: locksModel.$isLoading,
    isLoadingVoting: votingModel.$isLoading,
  },
  filter: ({ claimSchedule }) => nullable(claimSchedule),
  fn: ({ isLoadingLock, isLoadingVoting }) => {
    return isLoadingLock || isLoadingVoting;
  },
  target: $isLoading,
});

sample({
  clock: [referendumModel.events.referendumsReceived, locksModel.$trackLocks.updates, votingModel.$voting.updates],
  source: {
    network: networkSelectorModel.$network,
    tracks: tracksModel.$tracks,
    trackLocks: locksModel.$trackLocks,
    totalLock: locksModel.$totalLock,
    voting: votingModel.$voting,
    isLoading: $isLoading,
    referendums: referendumModel.$referendums,
  },
  filter: ({ network, referendums, trackLocks, totalLock, isLoading }) =>
    nonNullable(network) &&
    nonNullable(referendums[network.chain.chainId]) &&
    nonNullable(trackLocks[network.chain.chainId]) &&
    !isLoading &&
    !totalLock.isZero(),
  fn: ({ network, tracks, trackLocks, voting, referendums }) => ({
    api: network!.api,
    tracks,
    voting,
    trackLocks: trackLocks[network!.chain.chainId]!,
    referendums: referendums[network!.chain.chainId]!,
  }),
  target: getClaimScheduleFx,
});

sample({
  clock: getClaimScheduleFx.doneData,
  target: $claimSchedule,
});

export const unlockModel = {
  $isLoading,
  $totalUnlock,
  $claimable,
  $claimSchedule,
  $isUnlockable: $totalUnlock.map((total) => !total.isZero()),
};
