import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';
import { or } from 'patronum';

import { type ReferendumId } from '@shared/core';
import { voteHistoryModel, votingService } from '@entities/governance';
import { votingListService } from '../lib/votingListService';
import { networkSelectorModel } from '../model/networkSelector';
import { votingAssetModel } from '../model/votingAsset';
import { type AggregatedVoteHistory } from '../types/structs';

import { proposerIdentityAggregate } from './proposerIdentity';
import { tracksAggregate } from './tracks';
import { votingAggregate } from './voting';

const flow = createGate<{ referendumId: ReferendumId }>();

const $chainVoteHistory = combine(
  {
    history: voteHistoryModel.$voteHistory,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ history, chain }) => {
    if (!chain) {
      return {};
    }

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
      const votes = votingService.getReferendumAccountVotes(referendumId, voting);

      acc[referendumId] = historyList.flatMap(({ voter }) => {
        const proposer = proposers[voter] ?? null;
        const vote = votes[voter];
        if (!vote) {
          return [];
        }

        const splitVotes = votingListService.getDecoupledVotesFromVote(vote);

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

const requestVoteHistory = createEvent<{ referendumId: ReferendumId }>();

sample({
  clock: requestVoteHistory,
  source: networkSelectorModel.$governanceChain,
  filter: (chain) => !!chain,
  fn: (chain, { referendumId }) => ({
    referendumId,
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
  source: {
    api: networkSelectorModel.$governanceChainApi,
    tracks: tracksAggregate.$tracks,
  },
  filter: ({ api }) => !!api,
  fn: ({ api, tracks }, { result: history }) => ({
    addresses: history.map((x) => x.voter),
    tracks: Object.keys(tracks),
    api: api!,
  }),
  target: votingAggregate.events.requestVoting,
});

sample({
  clock: flow.open,
  target: requestVoteHistory,
});

export const voteHistoryAggregate = {
  $voteHistory,
  $voteHistoryLoading: or(voteHistoryModel.$voteHistoryLoading, votingAggregate.$isLoading),
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
