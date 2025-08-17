import { BN } from '@polkadot/util';
import { combine, createEvent, restore, sample } from 'effector';
import { groupBy, sortBy } from 'lodash';
import { combineEvents, readonly } from 'patronum';

import { type DelegateAccount } from '@/shared/api/governance';
import {
  Step,
  includesMultiple,
  isStep,
  keys,
  nonNullable,
  toAccountId,
  toAddress,
  validateAddress,
} from '@/shared/lib/utils';
import { walletSelect } from '@/aggregates/wallet-select';
import { delegateRegistryAggregate, delegationAggregate, networkSelectorModel } from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { submitModel } from '@/features/operations/OperationSubmit';
import { delegateModel } from '@/widgets/DelegateModal';
import { DelegationErrors, SortProp, SortType } from '../common/constants';

const flowFinished = createEvent();
const flowStarted = createEvent();
const stepChanged = createEvent<Step>();
const queryChanged = createEvent<string>();
const sortTypeChanged = createEvent<SortType>();
const selectDelegate = createEvent<DelegateAccount>();
const customDelegateChanged = createEvent<string>();
const openCustomModal = createEvent();
const closeCustomModal = createEvent();
const createCustomDelegate = createEvent();

const $step = restore(stepChanged, Step.NONE);
const $query = restore(queryChanged, '');
const $sortType = restore(sortTypeChanged, null);
const $customDelegate = restore(customDelegateChanged, '').reset(openCustomModal);

const $delegateList = combine(
  {
    activeWallet: walletSelect.$selectedWallet,
    delegationsList: delegateRegistryAggregate.$delegateRegistry,
    query: $query,
    sortType: $sortType,
  },
  ({ activeWallet, delegationsList, query, sortType }) => {
    const accounts = activeWallet?.accounts.map((a) => a.accountId) || [];
    const list = delegationsList.filter((d) => !accounts.includes(d.accountId));

    if (!sortType && !query) {
      const grouped = groupBy(list, (delegate) => !!delegate.name);

      return [
        ...sortBy(grouped['true'], (delegate) => delegate[SortProp[SortType.DELEGATIONS]] || 0).reverse(),
        ...sortBy(grouped['false'], (delegate) => delegate[SortProp[SortType.DELEGATIONS]] || 0).reverse(),
      ];
    }

    const searched = list.filter((delegate) =>
      includesMultiple([toAddress(delegate.accountId), delegate.name, delegate.shortDescription], query),
    );

    const sortProp = SortProp[sortType || SortType.DELEGATIONS];

    return searched.sort((a, b) => (new BN(a[sortProp] || 0).lt(new BN(b[sortProp] || 0)) ? 1 : -1));
  },
);

const $customError = combine(
  {
    delegate: $customDelegate,
    votes: delegationAggregate.$activeDelegations,
    accounts: walletSelect.$selectedAccounts,
    network: delegationAggregate.$network,
  },
  ({ delegate, votes, accounts, network }): DelegationErrors | null => {
    if (!network?.chain || !delegate || !validateAddress(delegate)) return DelegationErrors.INVALID_ADDRESS;

    const delegateAccountId = toAccountId(delegate);

    const isOwnAccount = accounts.some((a) => a.accountId === delegateAccountId);
    if (isOwnAccount) return DelegationErrors.YOUR_ACCOUNT;

    const isAlreadyDelegated = keys(votes).some((v) => v === delegateAccountId);
    if (isAlreadyDelegated) return DelegationErrors.ALREADY_DELEGATED;

    return null;
  },
);

sample({
  clock: flowStarted,
  source: networkSelectorModel.$governanceChain,
  filter: nonNullable,
  target: delegateRegistryAggregate.events.requestDelegateRegistry,
});

sample({
  clock: flowStarted,
  fn: () => Step.LIST,
  target: stepChanged,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

sample({
  clock: selectDelegate,
  target: delegateModel.events.flowStarted,
});

sample({
  clock: openCustomModal,
  fn: () => Step.CUSTOM_DELEGATION,
  target: $step,
});

sample({
  clock: closeCustomModal,
  fn: () => Step.LIST,
  target: $step,
});

sample({
  clock: createCustomDelegate,
  source: $customDelegate,
  fn: (delegate) =>
    // TODO add delegate validation before set
    ({
      accountId: toAccountId(delegate),
      delegators: 0,
      delegatorVotes: '0',
      delegateVotes: 0,
      delegateVotesMonth: 0,
    }) as DelegateAccount,
  target: delegateModel.events.flowStarted,
});

sample({
  clock: delegateModel.events.flowStarted,
  source: $step,
  filter: (step) => isStep(step, Step.CUSTOM_DELEGATION),
  target: closeCustomModal,
});

sample({
  clock: [
    combineEvents({
      events: [delegateModel.output.flowFinished, submitModel.output.formSubmitted],
      reset: flowStarted,
    }),
    navigationModel.events.navigateTo,
  ],
  target: flowFinished,
});

export const delegationModel = {
  $isListLoading: delegateRegistryAggregate.$isRegistryLoading,
  $delegateList: readonly($delegateList),
  $step: readonly($step),
  $query: readonly($query),
  $sortType: readonly($sortType),
  $customDelegate: readonly($customDelegate),
  $customError: readonly($customError),

  events: {
    flowStarted,
    queryChanged,
    sortTypeChanged,
    sortTypeReset: $sortType.reinit,
    selectDelegate,

    customDelegateChanged,
    openCustomModal,
    closeCustomModal,
    createCustomDelegate,
  },

  output: {
    flowFinished,
  },
};
