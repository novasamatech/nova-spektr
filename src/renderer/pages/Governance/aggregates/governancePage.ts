import { combine, sample } from 'effector';
import { createGate } from 'effector-react';
import { either, readonly } from 'patronum';

import { referendumModel, votingModel } from '@/entities/governance';
import { accountUtils, walletModel } from '@/entities/wallet';
import { locksModel } from '@/features/governance/model/locks';
import { filterModel, listAggregate, listService, networkSelectorModel, votingAggregate } from '@features/governance';
import { governancePageUtils } from '../lib/governancePageUtils';

const flow = createGate();

const $currentReferendums = listAggregate.$referendums.map((referendums) => {
  return listService.sortReferendums(referendums ?? []);
});

const $referendumsFilteredByQuery = combine(
  { referendums: $currentReferendums, query: filterModel.$debouncedQuery },
  governancePageUtils.filteredByQuery,
);

const $referendumsFilteredByStatus = combine(
  {
    referendums: $currentReferendums,
    selectedVoteId: filterModel.$selectedVoteId,
    selectedTrackIds: filterModel.$selectedTrackIds,
  },
  ({ referendums, selectedVoteId, selectedTrackIds }) => {
    return referendums.filter((referendum) => {
      const filteredByTracks = governancePageUtils.isReferendumInTrack(selectedTrackIds, referendum);
      const filteredByVote = governancePageUtils.isReferendumVoted({
        selectedVoteId,
        referendum,
      });

      return filteredByVote && filteredByTracks;
    });
  },
);

const $displayedCurrentReferendums = either(
  filterModel.$query.map((x) => x.length > 0),
  $referendumsFilteredByQuery,
  $referendumsFilteredByStatus,
);

const $ongoing = $displayedCurrentReferendums.map((x) => x.filter(governancePageUtils.isAggregatedReferendumOngoing));
const $completed = $displayedCurrentReferendums.map((x) =>
  x.filter(governancePageUtils.isAggregatedReferendumCompleted),
);

sample({
  clock: flow.open,
  source: { chain: networkSelectorModel.$governanceChain },
  filter: ({ chain }) => chain === null,
  target: networkSelectorModel.input.defaultChainSet,
});

sample({
  clock: flow.open,
  source: {
    chain: networkSelectorModel.$governanceChain,
    api: networkSelectorModel.$governanceChainApi,
    wallet: walletModel.$activeWallet,
  },
  filter: ({ chain, api, wallet }) => !!chain && !!api && !!wallet,
  fn: ({ api, chain, wallet }) => ({
    api: api!,
    addresses: accountUtils.getAddressesForWallet(wallet!, chain!),
    chain: chain!,
  }),
  target: [
    votingAggregate.events.requestVoting,
    referendumModel.events.subscribeReferendums,
    locksModel.events.subscribeLocks,
  ],
});

sample({
  clock: flow.close,
  target: locksModel.events.unsubscribeLocks,
});

sample({
  clock: flow.close,
  target: votingModel.events.unsubscribeVoting,
});

sample({
  clock: flow.close,
  target: referendumModel.events.unsubscribeReferendums,
});

export const governancePageAggregate = {
  $all: $displayedCurrentReferendums,
  $ongoing: readonly($ongoing),
  $completed: readonly($completed),
  $isSerching: filterModel.$query.map((x) => x.length > 0),
  $isLoading: listAggregate.$isLoading,
  $isTitlesLoading: listAggregate.$isTitlesLoading,

  gates: {
    flow,
  },
};
