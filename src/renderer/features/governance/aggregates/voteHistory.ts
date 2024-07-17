import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';

import { type ReferendumId } from '@shared/core';
import { voteHistoryModel } from '@entities/governance';
import { networkSelectorModel } from '../model/networkSelector';
import { proposerIdentityAggregate } from './proposerIdentity';
import { type AggregatedVoteHistory } from '../types/structs';
import { detailsAggregate } from './details';

const flow = createGate<{ referendumId: ReferendumId }>();

const $voteHistory = combine(
  {
    history: voteHistoryModel.$voteHistory,
    chain: networkSelectorModel.$governanceChain,
    proposers: proposerIdentityAggregate.$proposers,
  },
  ({ history, proposers, chain }) => {
    if (!chain) {
      return {};
    }

    const referendumsHistory = history[chain.chainId] ?? [];
    const acc: Record<ReferendumId, AggregatedVoteHistory[]> = {};

    for (const [referendumId, historyList] of Object.entries(referendumsHistory)) {
      acc[referendumId] = historyList.map((history) => {
        const proposer = proposers[history.voter] ?? null;

        return {
          ...history,
          name: proposer ? proposer.parent.name : null,
        };
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
  clock: flow.open,
  target: requestVoteHistory,
});

export const voteHistoryAggregate = {
  $voteHistory,
  $voteHistoryLoading: voteHistoryModel.$voteHistoryLoading,
  $chain: networkSelectorModel.$governanceChain,
  $votingAssets: detailsAggregate.$votingAssets,

  events: {
    requestVoteHistory,
    voteRequestHistoryDone: voteHistoryModel.events.voteHistoryRequestDone,
  },

  gates: {
    flow,
  },
};
