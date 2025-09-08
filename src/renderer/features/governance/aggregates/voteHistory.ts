import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId, type Referendum, type ReferendumId } from '@/shared/core';
import { entries, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { identity, identityService } from '@/domains/network';
import { voteHistoryModel } from '@/entities/governance';
import { votingListService } from '../lib/votingListService';
import { networkSelectorModel } from '../model/networkSelector';
import { votingAssetModel } from '../model/votingAsset';
import { type AggregatedVoteHistory } from '../types/structs';
import { totalVotingPowerSorting } from '../utils/votingPowerSorting';

import { listAggregate } from './list';

const flow = createGate<{ referendum: Referendum }>();

const $chainVoteHistory = combine(
  {
    history: voteHistoryModel.$voteHistory,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ history, chainId }) => {
    if (!chainId) return {};

    return history[chainId] ?? {};
  },
);

const $voteHistory = combine(
  {
    history: $chainVoteHistory,
    chainId: networkSelectorModel.$governanceChainId,
    identities: identity.$list,
  },
  ({ history, identities, chainId }) => {
    if (!chainId) return {};

    const result: Record<ReferendumId, AggregatedVoteHistory[]> = {};
    const chainIdentities = identities[chainId];

    for (const [referendumId, historyList] of entries(history)) {
      const voteGroups = votingListService.getVoteGroupsFromVotingHistory(historyList);

      const aggregatedHistory = voteGroups.map((group) => {
        const voterIdentity = chainIdentities[group.voter];
        const identityName = voterIdentity ? identityService.getFullName(voterIdentity) : null;

        return {
          ...group,
          name: identityName,
        };
      });

      result[referendumId] = aggregatedHistory.sort(totalVotingPowerSorting);
    }

    return result;
  },
);

const requestVoteHistory = createEvent<{ referendum: Referendum }>();

sample({
  clock: requestVoteHistory,
  source: networkSelectorModel.$governanceChain,
  filter: nonNullable,
  fn: (chain, { referendum }) => ({
    referendum,
    chain: chain!,
  }),
  target: voteHistoryModel.events.requestVoteHistory,
});

sample({
  clock: $chainVoteHistory,
  source: networkSelectorModel.$governanceChainId,
  filter: nonNullable,
  fn: (chainId: ChainId, history) => {
    const voters = new Set<AccountId>();

    for (const historyList of Object.values(history)) {
      for (const vote of historyList) {
        const splitVotes = votingListService.getDecoupledVotesFromVotingHistory(vote);
        for (const vote1 of splitVotes) {
          voters.add(vote1.voter);
        }
      }
    }

    return {
      chainId,
      accounts: Array.from(voters),
    };
  },
  target: identity.request,
});

sample({
  clock: voteHistoryModel.events.voteHistoryRequestDone,
  source: networkSelectorModel.$governanceChainId,
  filter: nonNullable,
  fn: (chainId: ChainId, { result }) => ({
    chainId,
    accounts: result.map((x) => x.voter),
  }),
  target: identity.request,
});

sample({
  clock: flow.open,
  target: requestVoteHistory,
});

sample({
  clock: listAggregate.$referendums,
  source: flow.state,
  filter: flow.status,
  target: requestVoteHistory,
});

export const voteHistoryAggregate = {
  $voteHistory,
  $isLoading: voteHistoryModel.$isLoading,
  $hasError: voteHistoryModel.$hasError,
  $chain: networkSelectorModel.$governanceChain,
  $votingAsset: votingAssetModel.$votingAsset,

  events: {
    requestVoteHistory,
    voteRequestHistoryDone: voteHistoryModel.events.voteHistoryRequestDone,
  },

  gates: {
    flow,
  },
};
