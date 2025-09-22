import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { entries, nullable } from '@/shared/lib/utils';
import { referendaPallet } from '@/shared/pallet/referenda';
import {
  approveThresholdModel,
  referendumModel,
  referendumService,
  supportThresholdModel,
  votingService,
} from '@/entities/governance';
import { networkSelectorModel } from '../model/networkSelector';
import { titleModel } from '../model/title';
import { type AggregatedReferendum } from '../types/structs';

import { delegatedVotesAggregate } from './delegatedVotes';
import { tracksAggregate } from './tracks';
import { votingAggregate } from './voting';

const $undecidingTimeout = createStore<number>(0);

const fetchUndecidingTimeoutFx = createEffect(async ({ api }: { api: ApiPromise }) => {
  await api.isReady;
  return referendaPallet.consts.undecidingTimeout('governance', api);
});

sample({
  clock: fetchUndecidingTimeoutFx.doneData,
  target: $undecidingTimeout,
});

const $chainReferendums = combine(
  {
    referendums: referendumModel.$referendums,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ referendums, chainId }) => {
    if (!chainId) return [];

    return referendums[chainId] ?? [];
  },
);

const $chainTitles = combine(
  {
    titles: titleModel.$titles,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ titles, chainId }) => {
    if (nullable(chainId)) return {};

    return titles[chainId] ?? {};
  },
);

const $approvalThresholds = combine(
  {
    thresholds: approveThresholdModel.$approvalThresholds,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ thresholds, chainId }) => {
    if (nullable(chainId)) return {};

    return thresholds[chainId] ?? {};
  },
);

const $supportThresholds = combine(
  {
    thresholds: supportThresholdModel.$supportThresholds,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ thresholds, chainId }) => {
    if (nullable(chainId)) return {};

    return thresholds[chainId] ?? {};
  },
);

const $referendums = combine(
  {
    referendums: $chainReferendums,
    delegatedVotes: delegatedVotesAggregate.$delegatedVotesInChain,
    approvalThresholds: $approvalThresholds,
    supportThresholds: $supportThresholds,
    chainId: networkSelectorModel.$governanceChainId,
    voting: votingAggregate.$activeWalletVotes,
    tracks: tracksAggregate.$tracks,
    api: networkSelectorModel.$governanceChainApi,
    accounts: votingAggregate.$possibleAccountsForVoting,
    undecidingTimeout: $undecidingTimeout,
  },
  ({
    referendums,
    chainId,
    approvalThresholds,
    supportThresholds,
    voting,
    delegatedVotes,
    tracks,
    api,
    accounts,
    undecidingTimeout,
  }): AggregatedReferendum[] => {
    if (!chainId || !api) {
      return [];
    }

    return referendums.map((referendum) => {
      const referendumVotes = votingService.getReferendumAccountVotes(referendum.referendumId, voting);
      const votes = entries(referendumVotes).map(([accountId, accountVote]) => ({
        voter: accountId,
        vote: accountVote,
      }));

      let end = null;
      let status = null;

      if (referendumService.isOngoing(referendum)) {
        const track = tracks[referendum.track];
        if (track) {
          end = referendumService.getReferendumEndTime(referendum, track, undecidingTimeout);
          status = referendumService.getReferendumStatus(referendum);
        }
      }

      return {
        ...referendum,
        end,
        status,
        approvalThreshold: approvalThresholds[referendum.referendumId] ?? null,
        supportThreshold: supportThresholds[referendum.referendumId] ?? null,
        votedByDelegates: delegatedVotes[referendum.referendumId] ?? [],
        voting: {
          of: accounts.length,
          votes,
        },
      };
    });
  },
);

const $isTitlesLoading = combine(
  {
    titles: titleModel.$loadingTitles,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ titles, chainId }) => {
    if (!chainId) return false;

    return titles[chainId] ?? false;
  },
);

sample({
  clock: networkSelectorModel.events.networkSelected,
  target: [referendumModel.events.subscribeReferendums, fetchUndecidingTimeoutFx],
});

export const listAggregate = {
  $referendums: readonly($referendums),
  $titles: $chainTitles,
  $isLoading: referendumModel.$isLoading,
  $isTitlesLoading,
  $isApprovalThresholdsLoading: approveThresholdModel.$getApproveThresholdsPending,
};
