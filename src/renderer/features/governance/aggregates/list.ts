import { combine, sample } from 'effector';
import { readonly } from 'patronum';

import { nullable } from '@/shared/lib/utils';
import {
  approveThresholdModel,
  referendumModel,
  referendumService,
  supportThresholdModel,
  votingService,
} from '@entities/governance';
import { networkSelectorModel } from '../model/networkSelector';
import { titleModel } from '../model/title';
import { type AggregatedReferendum } from '../types/structs';

import { delegatedVotesAggregate } from './delegatedVotes';
import { tracksAggregate } from './tracks';
import { votingAggregate } from './voting';

const $chainReferendums = combine(
  referendumModel.$referendums,
  networkSelectorModel.$governanceChain,
  (referendums, chain) => {
    if (!chain) {
      return [];
    }

    return referendums[chain.chainId] ?? [];
  },
);

const $chainTitles = combine(titleModel.$titles, networkSelectorModel.$governanceChain, (titles, chain) => {
  if (nullable(chain)) return {};

  return titles[chain.chainId] ?? {};
});

const $approvalThresholds = combine(
  approveThresholdModel.$approvalThresholds,
  networkSelectorModel.$governanceChain,
  (approvalThresholds, chain) => {
    if (nullable(chain)) return {};

    return approvalThresholds[chain.chainId] ?? {};
  },
);

const $supportThresholds = combine(
  supportThresholdModel.$supportThresholds,
  networkSelectorModel.$governanceChain,
  (supportThresholds, chain) => {
    if (nullable(chain)) return {};

    return supportThresholds[chain.chainId] ?? {};
  },
);

const $delegatedVotes = combine(
  delegatedVotesAggregate.$delegatedVotes,
  networkSelectorModel.$governanceChain,
  (delegatedVotes, chain) => {
    if (nullable(chain)) return {};

    return delegatedVotes[chain.chainId] ?? {};
  },
);

const $referendums = combine(
  {
    referendums: $chainReferendums,
    delegatedVotes: $delegatedVotes,
    titles: $chainTitles,
    approvalThresholds: $approvalThresholds,
    supportThresholds: $supportThresholds,
    chain: networkSelectorModel.$governanceChain,
    voting: votingAggregate.$activeWalletVotes,
    tracks: tracksAggregate.$tracks,
    api: networkSelectorModel.$governanceChainApi,
  },
  ({
    referendums,
    chain,
    titles,
    approvalThresholds,
    supportThresholds,
    voting,
    delegatedVotes,
    tracks,
    api,
  }): AggregatedReferendum[] => {
    if (!chain || !api) {
      return [];
    }

    const undecidingTimeout = api.consts.referenda.undecidingTimeout.toNumber();

    return referendums.map((referendum) => {
      const votes = votingService.getReferendumAccountVotes(referendum.referendumId, voting);
      // TODO support multishard voting
      const voteTupple = Object.entries(votes).at(0);
      const vote = voteTupple ? { voter: voteTupple[0], vote: voteTupple[1] } : null;

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
        vote,
        votedByDelegate: delegatedVotes[chain.chainId] ?? null,
      };
    });
  },
);

const $isTitlesLoading = combine(titleModel.$loadingTitles, networkSelectorModel.$governanceChain, (titles, chain) => {
  if (!chain) return false;

  return titles[chain.chainId] ?? false;
});

sample({
  clock: networkSelectorModel.events.networkSelected,
  target: referendumModel.events.subscribeReferendums,
});

export const listAggregate = {
  $referendums: readonly($referendums),
  $isLoading: referendumModel.$isLoading,
  $isTitlesLoading,
};
