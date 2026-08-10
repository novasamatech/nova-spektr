import { combine, createEvent, sample } from 'effector';
import { uniqBy } from 'lodash';

import { type TrackId, type VotingMap } from '@/shared/core';
import { nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountService, identity } from '@/domains/network';
import { votingModel, votingService } from '@/entities/governance';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { networkSelectorModel } from '../model/networkSelector';

import { tracksAggregate } from './tracks';

const requestVoting = createEvent<{ accounts: AccountId[]; tracks?: TrackId[] }>();

const $activeWalletVotes = combine(
  {
    voting: votingModel.$voting,
    wallet: walletSelect.$selectedWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ voting, wallet, chain }): VotingMap => {
    if (!chain || !wallet) {
      return {};
    }

    const accountIds = accountUtils.getAccountsIdsForWallet(wallet, chain);
    const result: VotingMap = {};

    for (const accountId of accountIds) {
      if (accountId in voting) {
        result[accountId] = voting[accountId]!;
      }
    }

    return result;
  },
);

const $possibleAccountsForVoting = combine(
  {
    wallet: walletSelect.$selectedWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ wallet, chain }) => {
    if (nullable(wallet) || nullable(chain)) return [];

    if (!walletUtils.isPolkadotVault(wallet)) {
      return wallet.accounts.filter((a) => accountService.isAccountAvailableOnChain(a, chain));
    }

    const accounts = wallet.accounts.filter((a) => {
      return accountService.isAccountAvailableOnChain(a, chain) && accountUtils.isVaultDerivedAccount(a);
    });

    const uniqueAccounts = uniqBy(accounts, 'accountId');

    if (uniqueAccounts.length > 0) return uniqueAccounts;

    return wallet.accounts.filter((a) => {
      return accountUtils.isVaultBaseAccount(a) && accountService.isAccountAvailableOnChain(a, chain);
    });
  },
);

sample({
  clock: requestVoting,
  source: {
    network: networkSelectorModel.$network,
    tracks: tracksAggregate.$tracks,
  },
  filter: ({ network }) => nonNullable(network),
  fn: ({ network, tracks: allTracks }, { accounts, tracks }) => ({
    api: network!.api,
    tracks: tracks || Object.keys(allTracks),
    accounts,
  }),
  target: votingModel.events.subscribeVoting,
});

sample({
  clock: [tracksAggregate.$tracks, walletSelect.$selectedWallet],
  source: {
    wallet: walletSelect.$selectedWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ wallet, chain }) => nonNullable(wallet) && nonNullable(chain),
  fn: ({ wallet, chain }) => ({
    accounts: accountUtils.getAccountsIdsForWallet(wallet!, chain!),
  }),
  target: requestVoting,
});

sample({
  clock: $activeWalletVotes,
  source: {
    chain: networkSelectorModel.$governanceChain,
    identity: identity.$list,
  },
  filter: ({ chain }) => nonNullable(chain),
  fn: ({ chain, identity }, activeVotes) => {
    const accounts = new Set<AccountId>();

    for (const voteList of Object.values(activeVotes)) {
      for (const vote of Object.values(voteList)) {
        if (!votingService.isDelegating(vote)) continue;

        const accountId = toAccountId(vote.target);
        if (nonNullable(identity[chain!.chainId]?.[accountId])) continue;

        accounts.add(accountId);
      }
    }

    return {
      chainId: chain!.chainId,
      accounts: Array.from(accounts),
    };
  },
  target: identity.request,
});

export const votingAggregate = {
  $activeWalletVotes,
  $possibleAccountsForVoting,
  $voting: votingModel.$voting,
  $isLoading: votingModel.$isLoading,

  events: {
    requestVoting,
  },
};
