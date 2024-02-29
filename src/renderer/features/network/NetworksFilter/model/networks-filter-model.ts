import { createEvent, createStore, sample, combine } from 'effector';

import { networkModel } from '@entities/network';
import { includes } from '@shared/lib/utils';

const formInitiated = createEvent();
const queryChanged = createEvent<string>();

const $filterQuery = createStore<string>('');

sample({
  clock: queryChanged,
  target: $filterQuery,
});

sample({
  clock: formInitiated,
  target: $filterQuery.reinit,
});

const $filteredNetworks = combine(
  {
    chains: networkModel.$chains,
    query: $filterQuery,
  },
  ({ chains, query }) => {
    if (!query) return Object.values(chains);

    return Object.values(chains).filter((c) => includes(c.name, query));
  },
);
export const networksFilterModel = {
  $filterQuery,
  $filteredNetworks,

  events: {
    formInitiated,
    queryChanged,
  },
};
