import { combine, sample } from 'effector';
import { readonly } from 'patronum';

import { nullable } from '@/shared/lib/utils';
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
    titles: $chainTitles,
    approvalThresholds: $approvalThresholds,
    supportThresholds: $supportThresholds,
    chainId: networkSelectorModel.$governanceChainId,
    voting: votingAggregate.$activeWalletVotes,
    tracks: tracksAggregate.$tracks,
    api: networkSelectorModel.$governanceChainApi,
    accounts: votingAggregate.$possibleAccountsForVoting,
  },
  ({
    referendums,
    chainId,
    titles,
    approvalThresholds,
    supportThresholds,
    voting,
    delegatedVotes,
    tracks,
    api,
    accounts,
  }): AggregatedReferendum[] => {
    if (!chainId || !api) {
      return [];
    }

    const undecidingTimeout = api.consts.referenda.undecidingTimeout.toNumber();

    return referendums.map((referendum) => {
      const referendumVotes = votingService.getReferendumAccountVotes(referendum.referendumId, voting);
      const votes = Object.entries(referendumVotes).map((x) => ({ voter: x[0], vote: x[1] }));

      let end = null;
      let status = null;

      if (referendumService.isOngoing(referendum)) {
        end = referendumService.getReferendumEndTime(referendum, tracks[referendum.track], undecidingTimeout);
        status = referendumService.getReferendumStatus(referendum);
      }

      return {
        ...referendum,
        end,
        status,
        title: titles[referendum.referendumId] ?? null,
        approvalThreshold: approvalThresholds[referendum.referendumId] ?? null,
        supportThreshold: supportThresholds[referendum.referendumId] ?? null,
        voting: {
          of: accounts.length,
          votes,
        },
        votedByDelegate: delegatedVotes[referendum.referendumId] ?? null,
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
  target: referendumModel.events.subscribeReferendums,
});

export const listAggregate = {
  $referendums: readonly($referendums),
  $isLoading: referendumModel.$isLoading,
  $isTitlesLoading,
};
