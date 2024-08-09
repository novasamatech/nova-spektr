import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';
import { or } from 'patronum';

import { type Referendum, type ReferendumId } from '@shared/core';
import { referendumService, voteHistoryModel, votingService } from '@entities/governance';
import { votingListService } from '../lib/votingListService';
import { networkSelectorModel } from '../model/networkSelector';
import { votingAssetModel } from '../model/votingAsset';
import { type AggregatedVoteHistory } from '../types/structs';

import { proposerIdentityAggregate } from './proposerIdentity';
import { tracksAggregate } from './tracks';
import { votingAggregate } from './voting';

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
    voting: votingAggregate.$voting,
    history: $chainVoteHistory,
    chain: networkSelectorModel.$governanceChain,
    proposers: proposerIdentityAggregate.$proposers,
  },
  ({ voting, history, proposers, chain }) => {
    if (!chain) {
      return {};
    }

    const acc: Record<ReferendumId, AggregatedVoteHistory[]> = {};

    for (const [referendumId, historyList] of Object.entries(history)) {
      const votes = votingService.getReferendumVoting(referendumId, voting);

      acc[referendumId] = historyList.flatMap(({ voter }) => {
        const proposer = proposers[voter] ?? null;
        const vote = votes[voter];
        if (!vote) {
          return [];
        }

        const splitVotes = votingListService.getDecoupledVotesFromVote(referendumId, vote);

        return splitVotes.map((vote) => {
          return {
            ...vote,
            name: proposer ? proposer.parent.name : null,
          };
        });
      });
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
  fn: ({ result: voteHistory }) => ({
    addresses: voteHistory.map((x) => x.voter),
  }),
  target: proposerIdentityAggregate.events.requestProposers,
});

sample({
  clock: voteHistoryModel.events.voteHistoryRequestDone,
  source: tracksAggregate.$tracks,
  fn: (tracks, { params, result: history }) => ({
    addresses: history.map((x) => x.voter),
    tracks: referendumService.isOngoing(params.referendum) ? [params.referendum.track] : Object.keys(tracks),
  }),
  target: votingAggregate.events.requestVoting,
});

sample({
  clock: flow.open,
  target: requestVoteHistory,
});

export const voteHistoryAggregate = {
  $voteHistory,
  $isLoading: or(voteHistoryModel.$isLoading, votingAggregate.$isLoading),
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
