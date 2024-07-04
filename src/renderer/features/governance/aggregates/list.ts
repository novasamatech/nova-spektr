import { combine, sample } from 'effector';
import { inFlight, not, or, readonly } from 'patronum';

import {
  approveThresholdModel,
  supportThresholdModel,
  referendumModel,
  votingModel,
  votingService,
} from '@entities/governance';
import { networkSelectorModel } from '../model/network-selector-model';
import { titleModel } from '../model/title-model';
import { AggregatedReferendum } from '../types/structs';

const $referendums = combine(
  {
    referendums: referendumModel.$referendums,
    titles: titleModel.$titles,
    approvalThresholds: approveThresholdModel.$approvalThresholds,
    supportThresholds: supportThresholdModel.$supportThresholds,
    chain: networkSelectorModel.$governanceChain,
    voting: votingModel.$voting,
  },
  ({ referendums, chain, titles, approvalThresholds, supportThresholds, voting }): AggregatedReferendum[] => {
    if (!chain) {
      return [];
    }

    const referendumsInChain = referendums[chain.chainId] ?? [];
    const titlesInChain = titles[chain.chainId] ?? {};
    const approvalInChain = approvalThresholds[chain.chainId] ?? {};
    const supportInChain = supportThresholds[chain.chainId] ?? {};

    return referendumsInChain.map((referendum) => {
      return {
        referendum,
        title: titlesInChain[referendum.referendumId] ?? null,
        approvalThreshold: approvalInChain[referendum.referendumId] ?? null,
        supportThreshold: supportInChain[referendum.referendumId] ?? null,
        isVoted: votingService.isReferendumVoted(referendum.referendumId, voting),
      };
    });
  },
);

sample({
  clock: networkSelectorModel.$governanceChainApi,
  source: {
    chain: networkSelectorModel.$governanceChain,
  },
  filter: (_, api) => !!api,
  fn: ({ chain }, api) => ({ api: api!, chain: chain! }),
  target: referendumModel.events.requestReferendums,
});

export const listAggregate = {
  $referendums: readonly($referendums),
  $isLoading: or(
    not(networkSelectorModel.$isConnectionActive),
    inFlight([
      referendumModel.effects.requestReferendumsFx,
      approveThresholdModel.effects.requestApproveThresholdsFx,
      supportThresholdModel.effects.requestSupportThresholdsFx,
      votingModel.effects.requestVotingFx,
    ]),
  ),

  effects: {
    requestReferendumsFx: referendumModel.effects.requestReferendumsFx,
  },

  events: {
    requestDone: referendumModel.events.requestDone,
  },
};
