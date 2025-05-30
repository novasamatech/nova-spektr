import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId, type Referendum, type ReferendumId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { identity } from '@/domains/network';
import { voteHistoryModel } from '@/entities/governance';
import { votingListService } from '../lib/votingListService';
import { networkSelectorModel } from '../model/networkSelector';
import { votingAssetModel } from '../model/votingAsset';
import { type AggregatedVoteHistory } from '../types/structs';
import { votingPowerSorting } from '../utils/votingPowerSorting';

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

    console.log({ identities, history });

    const result: Record<ReferendumId, AggregatedVoteHistory[]> = {};

    for (const [referendumId, historyList] of Object.entries(history)) {
      const aggregatedHistory = historyList.flatMap((vote) => {
        const splitVotes = votingListService.getDecoupledVotesFromVotingHistory(vote);

        return splitVotes.map((vote) => ({
          ...vote,
          name: identities[chainId]?.[vote.voter as AccountId]?.name ?? null,
        }));
      });

      result[referendumId] = aggregatedHistory.sort(votingPowerSorting);
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
  clock: voteHistoryModel.events.voteHistoryRequestDone,
  source: networkSelectorModel.$governanceChainId,
  filter: nonNullable,
  fn: (chainId: ChainId, { result }: { result: { voter: string }[] }) => ({
    chainId,
    accounts: result.map((x) => x.voter as AccountId),
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
