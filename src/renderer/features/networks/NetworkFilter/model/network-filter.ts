import { combine, createEvent, createStore, sample } from 'effector';

import { includes } from '@shared/lib/utils';
import { networkModel } from '@entities/network';

const componentMounted = createEvent();

const $filterQuery = createStore<string>('');
const queryChanged = createEvent<string>();
const queryReset = createEvent();

$filterQuery.on(queryChanged, (_, query) => query).reset(queryReset);

sample({
  clock: componentMounted,
  target: queryReset,
});

const $networksFiltered = combine(
  {
    chains: networkModel.$chains,
    query: $filterQuery,
  },
  ({ chains, query }) => {
    if (!query) return Object.values(chains);

    return Object.values(chains).filter((c) => includes(c.name, query));
  },
);

export const filterModel = {
  $networksFiltered,
  $filterQuery,
  events: {
    componentMounted,
    queryChanged,
  },
};
