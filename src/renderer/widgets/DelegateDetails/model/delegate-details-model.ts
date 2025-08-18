import { combine, createEvent, createStore, restore, sample } from 'effector';
import { uniq } from 'lodash';
import { combineEvents } from 'patronum';

import { type DelegateAccount } from '@/shared/api/governance';
import { entries, keys } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createInitiatorsStore } from '@/shared/transactions';
import { accountService } from '@/domains/network';
import { votingService } from '@/entities/governance';
import { permissionUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
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
const $delegate = restore(flowStarted, null).reset(flowStarted);

const closeModal = $isModalOpen.reinit;
const closeDelegationsModal = $isDelegationsOpen.reinit;

const $initiators = createInitiatorsStore({
  chain: networkSelectorModel.$governanceChain,
  accounts: walletSelect.$selectedAccounts,
});

const $activeTracks = combine(
  {
    delegate: $delegate,
    votes: votingAggregate.$activeWalletVotes,
  },
  ({ delegate, votes }) => {
    const activeTracks: Record<AccountId, Set<string>> = {};

    for (const [accountId, voteList] of entries(votes)) {
      for (const [key, vote] of entries(voteList)) {
        if (!votingService.isDelegating(vote)) continue;

        if (votingService.isDelegating(vote) && vote.target === delegate?.accountId) {
          if (!activeTracks[accountId]) {
            activeTracks[accountId] = new Set();
          }

          activeTracks[accountId].add(key);
        }
      }
    }

    return activeTracks;
  },
);

const $activeDelegations = combine(
  {
    delegations: delegationAggregate.$activeDelegations,
    delegate: $delegate,
  },
  ({ delegations, delegate }) => {
    if (!delegate) return {};

    return delegations[delegate.accountId] || {};
  },
);

const $activeAccounts = $activeDelegations.map(keys);

const $canDelegate = walletSelect.$selectedWallet.map((wallet) => !!wallet && permissionUtils.canDelegate(wallet));

const $isAddAvailable = combine(
  {
    activeAccounts: $activeAccounts,
    accounts: walletSelect.$selectedAccounts,
    chain: networkSelectorModel.$governanceChain,
    canDelegate: $canDelegate,
  },
  ({ canDelegate, activeAccounts, accounts, chain }) => {
    if (!chain) return false;

    const filteredAccounts = accountService.filterAccountsOnChain(accounts, chain);

    const freeAccounts = filteredAccounts.filter((account) => !activeAccounts.includes(account.accountId));

    return canDelegate && freeAccounts.length > 0;
  },
);

const $isViewAvailable = $activeDelegations.map((delegations) => {
  return Object.values(delegations).length > 1;
});

const $isRevokeAvailable = $activeDelegations.map((delegations) => {
  return Object.values(delegations).length === 1;
});

const $uniqueTracks = $activeTracks.map((tracks) => {
  const flatTracks = Object.values(tracks).flatMap((tracks) => [...tracks]);

  return uniq(flatTracks);
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
      accounts: [delegate.accountId],
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
  $uniqueTracks,
  $activeDelegations,
  $initiators,

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
