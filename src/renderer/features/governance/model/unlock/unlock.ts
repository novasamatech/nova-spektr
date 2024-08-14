import { type ApiPromise } from '@polkadot/api';
import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createStore, sample } from 'effector';
import { or } from 'patronum';

import { type ClaimTimeAt, type UnlockChunk, UnlockChunkType } from '@shared/api/governance';
import { type Address, type Referendum, type TrackId, type TrackInfo, type VotingMap } from '@shared/core';
import { getCreatedDateFromApi, getCurrentBlockNumber } from '@shared/lib/utils';
import { claimScheduleService, referendumModel, tracksModel, votingModel } from '@entities/governance';
import { walletModel } from '@entities/wallet';
import { unlockService } from '../../lib/unlockService';
import { locksModel } from '../locks';
import { networkSelectorModel } from '../networkSelector';

const $claimSchedule = createStore<UnlockChunk[]>([]);
const $totalUnlock = createStore<BN>(BN_ZERO);

type Props = {
  api: ApiPromise;
  referendums: Referendum[];
  tracks: Record<TrackId, TrackInfo>;
  trackLocks: Record<Address, Record<TrackId, BN>>;
  voting: VotingMap;
};

const getClaimScheduleFx = createEffect(
  async ({ api, referendums, tracks, trackLocks, voting }: Props): Promise<UnlockChunk[]> => {
    const currentBlockNumber = await getCurrentBlockNumber(api);
    const undecidingTimeout = api.consts.referenda.undecidingTimeout.toNumber();
    const voteLockingPeriod = api.consts.convictionVoting.voteLockingPeriod.toNumber();

    const claims = Object.entries(trackLocks).flatMap(([address, trackLock]) => {
      const claimSchedule = claimScheduleService.estimateClaimSchedule({
        currentBlockNumber,
        referendums,
        tracks,
        trackLocks: trackLock,
        votingByTrack: voting[address],
        voteLockingPeriod,
        undecidingTimeout,
      });

      return unlockService.filterClaims(claimSchedule, address);
    });

    return Promise.all(
      claims.map((claim) => {
        if (claim.type !== UnlockChunkType.PENDING_LOCK) return claim;

        return getCreatedDateFromApi((claim.claimableAt as ClaimTimeAt).block, api).then((timeToBlock) => ({
          ...claim,
          timeToBlock,
        }));
      }),
    ).then((result) => result);
  },
);

sample({
  clock: [referendumModel.events.requestDone, locksModel.$trackLocks.updates, votingModel.$voting.updates],
  source: {
    api: networkSelectorModel.$governanceChainApi,
    tracks: tracksModel.$tracks,
    trackLocks: locksModel.$trackLocks,
    totalLock: locksModel.$totalLock,
    lockIsLoading: locksModel.$isLoading,
    voting: votingModel.$voting,
    votingIsLoading: votingModel.$isLoading,
    referendums: referendumModel.$referendums,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ api, chain, referendums, totalLock, votingIsLoading, lockIsLoading }) =>
    !!api && !!chain && !!referendums[chain!.chainId] && !votingIsLoading && !lockIsLoading && !totalLock.isZero(),
  fn: ({ api, tracks, trackLocks, voting, referendums, chain }) => ({
    api: api!,
    tracks,
    trackLocks,
    voting,
    referendums: referendums[chain!.chainId],
  }),
  target: getClaimScheduleFx,
});

sample({
  clock: [locksModel.$totalLock.updates, walletModel.$activeWallet],
  target: [$claimSchedule.reinit, $totalUnlock.reinit],
});

sample({
  clock: getClaimScheduleFx.doneData,
  target: $claimSchedule,
});

sample({
  clock: $claimSchedule.updates,
  fn: (claimSchedule) => {
    return claimSchedule.reduce((acc, claim) => {
      if (claim.type !== UnlockChunkType.CLAIMABLE) return acc;

      return acc.add(claim.amount);
    }, BN_ZERO);
  },
  target: $totalUnlock,
});

export const unlockModel = {
  $isLoading: or(locksModel.$isLoading, getClaimScheduleFx.pending),
  $totalUnlock,
  $claimSchedule,
  $isUnlockable: combine($totalUnlock, (totalUnlock) => !totalUnlock.isZero()),
};
