import { combine, createEvent, restore, sample } from 'effector';
import { groupBy, sortBy } from 'lodash';
import { readonly } from 'patronum';

import { Step, includesMultiple } from '@/shared/lib/utils';
import { delegateRegistryModel } from '@/entities/governance/model/delegateRegistry';
import { networkSelectorModel } from '@/features/governance';

const flowFinished = createEvent();
const flowStarted = createEvent();
const stepChanged = createEvent<Step>();
const queryChanged = createEvent<string>();

const $step = restore(stepChanged, Step.NONE);
const $query = restore(queryChanged, '');

const $delegateList = combine(
  {
    list: delegateRegistryModel.$delegateRegistry,
    query: $query,
  },
  ({ list, query }) => {
    const result = list.filter((delegate) =>
      includesMultiple([delegate.accountId, delegate.address, delegate.name, delegate.shortDescription], query),
    );

    const grouped = groupBy(result, (delegate) => !!delegate.name);

    return [
      ...sortBy(grouped['true'], (delegate) => delegate.delegators || 0).reverse(),
      ...sortBy(grouped['false'], (delegate) => delegate.delegators || 0).reverse(),
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
  $delegateList,
  $step: readonly($step),
  $query,

  events: {
    flowStarted,
    queryChanged,
  },

  output: {
    flowFinished,
  },
};
