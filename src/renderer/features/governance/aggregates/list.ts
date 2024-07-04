import { combine, sample } from 'effector';
import { inFlight, not, or, readonly } from 'patronum';

import {
  approveThresholdModel,
  supportThresholdModel,
  referendumModel as referendumModelEntity,
  votingModel,
} from '@entities/governance';
import { networkSelectorModel } from '../model/network-selector-model';
import { titleModel } from '../model/title-model';
import { AggregatedReferendum } from '../types/structs';

const $referendums = combine(
  {
    referendums: referendumModelEntity.$referendums,
    titles: titleModel.$titles,
    approvalThresholds: approveThresholdModel.$approvalThresholds,
    supportThresholds: supportThresholdModel.$supportThresholds,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ referendums, chain, titles, approvalThresholds, supportThresholds }): AggregatedReferendum[] => {
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
  target: referendumModelEntity.events.requestReferendums,
});

export const listAggregate = {
  $referendums: readonly($referendums),
  $requestPending: referendumModelEntity.$isReferendumsLoading,
  $isLoading: or(
    not(networkSelectorModel.$isConnectionActive),
    inFlight([
      referendumModelEntity.effects.requestReferendumsFx,
      approveThresholdModel.effects.requestApproveThresholdsFx,
      supportThresholdModel.effects.requestSupportThresholdsFx,
      votingModel.effects.requestVotingFx,
    ]),
  ),

  effects: {
    requestReferendumsFx: referendumModelEntity.effects.requestReferendumsFx,
  },
  events: {
    requestDone: referendumModelEntity.events.requestDone,
  },
};
