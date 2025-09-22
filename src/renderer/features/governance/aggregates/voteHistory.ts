import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId, type Referendum, type ReferendumId } from '@/shared/core';
import { entries, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts, identity, identityService } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { voteHistoryModel } from '@/entities/governance';
import { votingListService } from '../lib/votingListService';
import { networkSelectorModel } from '../model/networkSelector';
import { type AggregatedVoteHistory } from '../types/structs';
import { totalVotingPowerSorting } from '../utils/votingPowerSorting';

import { listAggregate } from './list';

const flow = createGate<{ referendum: Referendum }>();

const $accountNameByAccountId = combine(
  {
    accounts: accounts.$list,
    contacts: contactModel.$contacts,
  },
  ({ accounts, contacts }) => {
    const accountNameByAccountId: Record<AccountId, string> = {};

    for (const account of accounts) {
      accountNameByAccountId[account.accountId] = account.name;
    }

    for (const contact of contacts) {
      accountNameByAccountId[contact.accountId] = contact.name;
    }

    return accountNameByAccountId;
  },
);

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
    accountNameByAccountId: $accountNameByAccountId,
  },
  ({ history, identities, chainId, accountNameByAccountId }) => {
    if (!chainId) return {};

    const result: Record<ReferendumId, AggregatedVoteHistory[]> = {};
    const chainIdentities = identities[chainId];

    const resolveAccountName = (accountId: AccountId): string | null => {
      const accountIdentity = chainIdentities?.[accountId];
      if (accountIdentity) return identityService.getFullName(accountIdentity);
      if (accountNameByAccountId[accountId]) return accountNameByAccountId[accountId];
      return null;
    };

    for (const [referendumId, historyList] of entries(history)) {
      const voteGroups = votingListService.getVoteGroupsFromVotingHistory(historyList, resolveAccountName);

      const aggregatedHistory = voteGroups.map((group) => {
        const voterName = resolveAccountName(group.voter);

        return {
          ...group,
          name: voterName,
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
  $votingAsset: networkSelectorModel.$network.map((network) => network?.asset ?? null),

  events: {
    requestVoteHistory,
    voteRequestHistoryDone: voteHistoryModel.events.voteHistoryRequestDone,
  },

  gates: {
    flow,
  },
};
