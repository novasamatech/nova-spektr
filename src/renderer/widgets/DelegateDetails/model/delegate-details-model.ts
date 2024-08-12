import { combine, createEvent, createStore, sample } from 'effector';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Address } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { accountUtils, walletModel } from '@/entities/wallet';
import { delegationAggregate, networkSelectorModel, votingAggregate } from '@/features/governance';

const flowStarted = createEvent<DelegateAccount>();
const openDelegations = createEvent();

const $isModalOpen = createStore(false);
const $isDelegationsOpen = createStore(false);
const $delegate = createStore<DelegateAccount | null>(null);

const $activeTracks = combine(
  {
    activeVotes: votingAggregate.$activeWalletVotes,
  },
  ({ activeVotes }) => {
    const activeTracks = new Map<Address, Set<string>>();

    Object.entries(activeVotes).forEach(([address, delegations]) => {
      Object.keys(delegations).forEach((key) => {
        if (!activeTracks.has(address)) {
          activeTracks.set(address, new Set());
        }

        activeTracks.get(address)!.add(key);
      });
    });

    return Object.fromEntries(activeTracks);
  },
);

const $activeAccounts = combine(
  {
    activeVotes: votingAggregate.$activeWalletVotes,
  },
  ({ activeVotes }) => {
    return Object.entries(activeVotes)
      .filter(([_, delegations]) => Object.keys(delegations).length > 0)
      .map(([address]) => address);
  },
);

const $isAddAvailable = combine(
  {
    activeAccounts: $activeAccounts,
    activeWallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ activeAccounts, activeWallet, chain }) => {
    if (!chain || !activeWallet) return false;

    const accounts = activeWallet?.accounts.filter((account) => accountUtils.isChainAndCryptoMatch(account, chain));

    const freeAccounts = accounts.filter(
      (account) => !activeAccounts.includes(toAddress(account.accountId, { prefix: chain.addressPrefix })),
    );

    return freeAccounts.length > 0;
  },
);

const $isViewAvailable = combine(
  {
    activeDelegations: delegationAggregate.$activeDelegations,
  },
  ({ activeDelegations }) => {
    return Object.values(activeDelegations).length > 1;
  },
);

sample({
  clock: flowStarted,
  fn: () => true,
  target: $isModalOpen,
});

sample({
  clock: flowStarted,
  target: $delegate,
});

sample({
  clock: openDelegations,
  fn: () => true,
  target: $isDelegationsOpen,
});

export const delegateDetailsModel = {
  $isModalOpen,
  $delegate,
  $activeAccounts,
  $activeTracks,
  $uniqueTracks: $activeTracks.map((tracks) => [...new Set(...Object.values(tracks))]),
  $activeDelegations: delegationAggregate.$activeDelegations,

  $isAddAvailable,
  $isViewAvailable,
  $isDelegationsOpen,

  $chain: networkSelectorModel.$governanceChain,

  events: {
    flowStarted,
    closeModal: $isModalOpen.reinit,

    openDelegations,
    closeDelegationsModal: $isDelegationsOpen.reinit,
  },
};
