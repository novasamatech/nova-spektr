import { combine, sample } from 'effector';
import { readonly } from 'patronum';

import { nonNullable } from '@shared/lib/utils';
import { approveThresholdModel, referendumModel, supportThresholdModel, votingService } from '@entities/governance';
import { networkSelectorModel } from '../model/networkSelector';
import { titleModel } from '../model/title';
import { type AggregatedReferendum } from '../types/structs';

import { delegatedVotesAggregate } from './delegatedVotes';
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

const $referendums = combine(
  {
    referendums: $chainReferendums,
    delegatedVotes: delegatedVotesAggregate.$delegatedVotes,
    titles: titleModel.$titles,
    approvalThresholds: approveThresholdModel.$approvalThresholds,
    supportThresholds: supportThresholdModel.$supportThresholds,
    chain: networkSelectorModel.$governanceChain,
    voting: votingAggregate.$activeWalletVotes,
  },
  ({
    referendums,
    chain,
    titles,
    approvalThresholds,
    supportThresholds,
    voting,
    delegatedVotes,
  }): AggregatedReferendum[] => {
    if (!chain) {
      return [];
    }

    const delegatedVotesInChain = delegatedVotes[chain.chainId] ?? {};
    const titlesInChain = titles[chain.chainId] ?? {};
    const approvalInChain = approvalThresholds[chain.chainId] ?? {};
    const supportInChain = supportThresholds[chain.chainId] ?? {};

    return referendums.map((referendum) => {
      return {
        ...referendum,
        title: titlesInChain[referendum.referendumId] ?? null,
        approvalThreshold: approvalInChain[referendum.referendumId] ?? null,
        supportThreshold: supportInChain[referendum.referendumId] ?? null,
        isVoted: votingService.isReferendumVoted(referendum.referendumId, voting),
        votedByDelegate: delegatedVotesInChain[referendum.referendumId] ?? null,
      };
    });
  },
);

sample({
  clock: networkSelectorModel.$governanceChainApi,
  source: networkSelectorModel.$governanceChain,
  filter: (chain, api) => nonNullable(api) && nonNullable(chain),
  fn: (chain, api) => ({ chain: chain!, api: api! }),
  target: referendumModel.events.subscribeReferendums,
});

export const listAggregate = {
  $referendums: readonly($referendums),
  $isLoading: referendumModel.$isLoading,
};
