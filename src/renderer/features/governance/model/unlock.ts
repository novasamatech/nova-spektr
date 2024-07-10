import { createEvent, createStore, sample, createEffect, restore } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { Step, getCreatedDateFromApi, getCurrentBlockNumber } from '@shared/lib/utils';
import { ClaimTimeAt, UnlockChunk, UnlockChunkType, claimScheduleService } from '@shared/api/governance';
import { Address, ReferendumInfo, TrackId, TrackInfo, VotingMap } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { referendumModel } from '@entities/governance';
import { unlockService } from '../lib/unlock';
import { votingAggregate } from '../aggregates/voting';
import { tracksAggregate } from '../aggregates/tracks';
import { networkSelectorModel } from './networkSelector';
import { locksModel } from './locks';

const stepChanged = createEvent<Step>();
const flowStarted = createEvent();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore<Step>(stepChanged, Step.NONE);
const $claimSchedule = createStore<UnlockChunk[]>([]);
const $isLoading = createStore<boolean>(true);

type Props = {
  api: ApiPromise;
  referendums: ReferendumInfo[];
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

// const $unlockStore = createStore<UnlockStore | null>(null);

// const $initiatorWallet = combine(
//   {
//     store: $unlockStore,
//     wallets: walletModel.$wallets,
//   },
//   ({ store, wallets }) => {
//     if (!store) return undefined;

//     return walletUtils.getWalletById(wallets, store.shards[0].walletId);
//   },
//   { skipVoid: false },
// );

sample({
  clock: [referendumModel.events.requestDone, locksModel.$trackLocks, walletModel.$activeWallet],
  source: {
    api: networkSelectorModel.$governanceChainApi,
    tracks: tracksAggregate.$tracks,
    trackLocks: locksModel.$trackLocks,
    voting: votingAggregate.$currentWalletVoting,
    referendums: referendumModel.$referendums,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ api, voting, trackLocks, chain }) => !!api && !!chain && !!voting && !!trackLocks,
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
  clock: getClaimScheduleFx.doneData,
  target: $claimSchedule,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: getClaimScheduleFx.finally,
  fn: () => false,
  target: $isLoading,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const unlockModel = {
  $step,
  $claimSchedule,
  $isLoading,
  $isUnlockable: $claimSchedule.map((c) => c.some((claim) => claim.type === UnlockChunkType.CLAIMABLE)),

  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
