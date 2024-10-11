import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Referendum, type ReferendumId } from '@shared/core';
import { voteHistoryModel } from '@entities/governance';
import { votingListService } from '../lib/votingListService';
import { networkSelectorModel } from '../model/networkSelector';
import { votingAssetModel } from '../model/votingAsset';
import { type AggregatedVoteHistory } from '../types/structs';
import { votingPowerSorting } from '../utils/votingPowerSorting';

import { listAggregate } from './list';
import { proposerIdentityAggregate } from './proposerIdentity';

const flow = createGate<{ referendum: Referendum }>();

const $chainVoteHistory = combine(
  voteHistoryModel.$voteHistory,
  networkSelectorModel.$governanceChain,
  (history, chain) => {
    if (!chain) return {};

    return history[chain.chainId] ?? {};
  },
);

const $voteHistory = combine(
  {
    history: $chainVoteHistory,
    chain: networkSelectorModel.$governanceChain,
    proposers: proposerIdentityAggregate.$proposers,
  },
  ({ history, proposers, chain }) => {
    if (!chain) return {};

    const acc: Record<ReferendumId, AggregatedVoteHistory[]> = {};

    for (const [referendumId, historyList] of Object.entries(history)) {
      acc[referendumId] = historyList
        .flatMap((vote) => {
          const proposer = proposers[vote.voter] ?? null;

          const splitVotes = votingListService.getDecoupledVotesFromVotingHistory(vote);

          return splitVotes.map((vote) => {
            return {
              ...vote,
              name: proposer ? proposer.parent.name : null,
            };
          });
        })
        .sort(votingPowerSorting);
    }

    return acc;
  },
);

const requestVoteHistory = createEvent<{ referendum: Referendum }>();

sample({
  clock: requestVoteHistory,
  source: networkSelectorModel.$governanceChain,
  filter: (chain) => !!chain,
  fn: (chain, { referendum }) => ({
    referendum,
    chain: chain!,
  }),
  target: voteHistoryModel.events.requestVoteHistory,
});

sample({
  clock: voteHistoryModel.events.voteHistoryRequestDone,
  fn: ({ result }) => ({
    addresses: result.map((x) => x.voter),
  }),
  target: proposerIdentityAggregate.events.requestProposers,
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
