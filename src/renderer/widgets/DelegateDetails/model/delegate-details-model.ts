import { combine, createEvent, createStore, sample } from 'effector';
import uniq from 'lodash/uniq';
import { combineEvents } from 'patronum';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Address } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';
import { accountUtils, permissionUtils, walletModel } from '@/entities/wallet';
import {
  delegateRegistryAggregate,
  delegationAggregate,
  networkSelectorModel,
  proposerIdentityAggregate,
  votingAggregate,
} from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { submitModel } from '@/features/operations/OperationSubmit';
import { delegateModel } from '@/widgets/DelegateModal';

const flowStarted = createEvent<DelegateAccount>();
const openDelegations = createEvent();

const $isModalOpen = createStore(false);
const $isDelegationsOpen = createStore(false);
const $delegate = createStore<DelegateAccount | null>(null).reset(flowStarted);

const closeModal = $isModalOpen.reinit;
const closeDelegationsModal = $isDelegationsOpen.reinit;

const $activeTracks = combine(
  {
    votes: votingAggregate.$activeWalletVotes,
    delegate: $delegate,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ votes, delegate, chain }) => {
    const activeTracks: Record<Address, Set<string>> = {};

    for (const [address, delegations] of Object.entries(votes)) {
      for (const [key, vote] of Object.entries(delegations)) {
        if (!votingService.isDelegating(vote)) continue;

        const target = toAddress(toAccountId(vote.target), { prefix: chain?.addressPrefix });

        if (votingService.isDelegating(vote) && target === delegate?.accountId) {
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

    const accounts = activeWallet?.accounts.filter((account) => {
      const isChainAndCryptoMatch = accountUtils.isChainAndCryptoMatch(account, chain);
      const isNonBaseVaultAccount = accountUtils.isNonBaseVaultAccount(account, activeWallet);

      return isChainAndCryptoMatch && isNonBaseVaultAccount;
    });

    const freeAccounts = accounts.filter(
      (account) => !activeAccounts.includes(toAddress(account.accountId, { prefix: chain.addressPrefix })),
    );

    return canDelegate && freeAccounts.length > 0;
  },
);

const $isViewAvailable = $activeDelegations.map((delegations) => {
  return Object.values(delegations).length > 1;
});

const $isRevokeAvailable = $activeDelegations.map((delegations) => {
  return Object.values(delegations).length === 1;
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
  clock: flowStarted,
  target: delegateRegistryAggregate.events.requestDelegateRegistry,
});

sample({
  clock: flowStarted,
  fn: (delegate) => {
    return {
      addresses: [delegate.accountId],
    };
  },
  target: proposerIdentityAggregate.events.requestProposers,
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
  clock: [
    navigationModel.events.navigateTo,
    combineEvents({
      events: [delegateModel.output.flowFinished, submitModel.output.formSubmitted],
      reset: flowStarted,
    }),
  ],
  target: [closeModal, closeDelegationsModal],
});

export const delegateDetailsModel = {
  $isModalOpen,
  $delegate,
  $activeAccounts,
  $activeTracks,
  $uniqueTracks: $activeTracks.map((tracks) =>
    uniq(
      Object.values(tracks)
        .map((tracks) => [...tracks])
        .flat(),
    ),
  ),
  $activeDelegations,

  $isAddAvailable,
  $isEditAvailable: $isRevokeAvailable,
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
