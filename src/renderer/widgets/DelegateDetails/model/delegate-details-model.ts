import { combine, createEvent, createStore, sample } from 'effector';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Address } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';
import { accountUtils, permissionUtils, walletModel } from '@/entities/wallet';
import { delegationAggregate, networkSelectorModel, votingAggregate } from '@/features/governance';
import { navigationModel } from '@/features/navigation';

const flowStarted = createEvent<DelegateAccount>();
const openDelegations = createEvent();

const $isModalOpen = createStore(false);
const $isDelegationsOpen = createStore(false);
const $delegate = createStore<DelegateAccount | null>(null).reset(flowStarted);

const closeModal = $isModalOpen.reinit;
const closeDelegationsModal = $isDelegationsOpen.reinit;

const $activeTracks = combine(
  { votes: votingAggregate.$activeWalletVotes, delegate: $delegate },
  ({ votes, delegate }) => {
    const activeTracks: Record<Address, Set<string>> = {};

    for (const [address, delegations] of Object.entries(votes)) {
      for (const [key, vote] of Object.entries(delegations)) {
        if (votingService.isDelegating(vote) && vote.target === delegate?.accountId) {
          if (!activeTracks[address]) {
            activeTracks[address] = new Set();
          }

          activeTracks[address].add(key);
        }
      }
    }

    return activeTracks;
  },
);

const $activeDelegations = combine(
  { delegations: delegationAggregate.$activeDelegations, delegate: $delegate },
  ({ delegations, delegate }) => {
    if (!delegate) return {};

    return delegations[delegate.accountId] || {};
  },
);

const $activeAccounts = $activeDelegations.map(Object.keys);

const $canDelegate = walletModel.$activeWallet.map((wallet) => !!wallet && permissionUtils.canDelegate(wallet));

const $isAddAvailable = combine(
  {
    activeAccounts: $activeAccounts,
    activeWallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
    canDelegate: $canDelegate,
  },
  ({ canDelegate, activeAccounts, activeWallet, chain }) => {
    if (!chain || !activeWallet) return false;

    const accounts = activeWallet?.accounts.filter((account) => accountUtils.isChainAndCryptoMatch(account, chain));

    const freeAccounts = accounts.filter(
      (account) => !activeAccounts.includes(toAddress(account.accountId, { prefix: chain.addressPrefix })),
    );

    return canDelegate && freeAccounts.length > 0;
  },
);

const $isViewAvailable = $activeDelegations.map((delegations) => {
  return Object.values(delegations).length > 1;
});

const $isRevokeAvailable = $activeDelegations.map((activeDelegations) => {
  return Object.values(activeDelegations).length === 1;
});

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

sample({
  clock: $activeAccounts,
  filter: ($activeAccounts) => $activeAccounts.length === 0,
  target: closeDelegationsModal,
});

sample({
  clock: navigationModel.events.navigateTo,
  target: [closeModal, closeDelegationsModal],
});

export const delegateDetailsModel = {
  $isModalOpen,
  $delegate,
  $activeAccounts,
  $activeTracks,
  $uniqueTracks: delegationAggregate.$activeWalletDelegatedTracks,
  $activeDelegations,

  $isAddAvailable,
  $isViewAvailable,
  $isRevokeAvailable,
  $isDelegationsOpen,

  $chain: networkSelectorModel.$governanceChain,

  events: {
    flowStarted,
    closeModal,

    openDelegations,
    closeDelegationsModal,
  },
};
