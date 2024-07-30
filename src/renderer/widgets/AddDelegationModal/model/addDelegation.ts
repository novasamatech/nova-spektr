import { combine, createEvent, restore, sample } from 'effector';
import { groupBy, sortBy } from 'lodash';
import { readonly } from 'patronum';

import { Step, includesMultiple } from '@/shared/lib/utils';
import { delegateRegistryModel } from '@/entities/governance/model/delegateRegistry';
import { networkSelectorModel, votingAggregate } from '@/features/governance';
import { SortProp, SortType } from '../common/constants';

const flowFinished = createEvent();
const flowStarted = createEvent();
const stepChanged = createEvent<Step>();
const queryChanged = createEvent<string>();
const sortTypeChanged = createEvent<SortType>();

const $step = restore(stepChanged, Step.NONE);
const $query = restore(queryChanged, '');
const $sortType = restore(sortTypeChanged, null);

const $delegateList = combine(
  {
    list: delegateRegistryModel.$delegateRegistry,
    delegationsList: votingAggregate.$delegationsList,
    query: $query,
    sortType: $sortType,
  },
  ({ list, delegationsList, query, sortType }) => {
    const delegatedList = delegationsList
      ? list.filter((delegate) => delegationsList.includes(delegate.accountId))
      : list;

    const searched =
      delegationsList.length === 0 || query
        ? list.filter((delegate) =>
            includesMultiple([delegate.accountId, delegate.address, delegate.name, delegate.shortDescription], query),
          )
        : delegatedList;

    const grouped = groupBy(searched, (delegate) => !!delegate.name);
    const sortProp = SortProp[sortType || SortType.DELEGATIONS];

    return [
      ...sortBy(grouped['true'], (delegate) => delegate[sortProp] || 0).reverse(),
      ...sortBy(grouped['false'], (delegate) => delegate[sortProp] || 0).reverse(),
    ];
  },
);

sample({
  clock: flowStarted,
  source: networkSelectorModel.$governanceChain,
  filter: (chain) => !!chain,
  target: delegateRegistryModel.events.requestDelegateRegistry,
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

export const addDelegationModel = {
  $isListLoading: delegateRegistryModel.$isRegistryLoading,
  $delegateList: readonly($delegateList),
  $step: readonly($step),
  $query: readonly($query),
  $sortType: readonly($sortType),

  events: {
    flowStarted,
    queryChanged,
    sortTypeChanged,
    sortTypeReset: $sortType.reinit,
  },

  output: {
    flowFinished,
  },
};
