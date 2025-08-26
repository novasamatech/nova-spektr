import { combine, sample } from 'effector';
import { createGate } from 'effector-react';
import { either, readonly } from 'patronum';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { referendumModel, votingModel } from '@/entities/governance';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { filterModel, listAggregate, listService, networkSelectorModel, votingAggregate } from '@/features/governance';
import { locksModel } from '@/features/governance/model/locks';
import { governancePageUtils } from '../lib/governancePageUtils';

const flow = createGate();

const $currentReferendums = listAggregate.$referendums.map((referendums) => {
  return listService.sortReferendums(referendums ?? []);
});

const $referendumsFilteredByQuery = combine(
  {
    referendums: $currentReferendums,
    query: filterModel.$debouncedQuery,
    titles: listAggregate.$titles,
  },
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

const $ongoing = $displayedCurrentReferendums.map((referendums) => {
  return referendums.filter(governancePageUtils.isAggregatedReferendumOngoing);
});

const $completed = $displayedCurrentReferendums.map((referendums) => {
  return referendums.filter(governancePageUtils.isAggregatedReferendumCompleted);
});

sample({
  clock: flow.open,
  source: networkSelectorModel.$network,
  filter: nullable,
  target: networkSelectorModel.events.resetNetwork,
});

sample({
  clock: flow.open,
  source: {
    network: networkSelectorModel.$network,
    wallet: walletSelect.$selectedWallet,
  },
  filter: ({ network, wallet }) => nonNullable(network) && nonNullable(wallet),
  fn: ({ network, wallet }) => ({
    api: network!.api,
    accounts: accountUtils.getAccountsIdsForWallet(wallet!, network!.chain),
    chain: network!.chain,
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
  $currentReferendums: readonly($currentReferendums),
  $displayedReferendums: readonly($displayedCurrentReferendums),
  $ongoing: readonly($ongoing),
  $completed: readonly($completed),
  $isSearching: filterModel.$query.map((x) => x.length > 0),
  $isLoading: listAggregate.$isLoading,
  $isTitlesLoading: listAggregate.$isTitlesLoading,

  gates: {
    flow,
  },
};
