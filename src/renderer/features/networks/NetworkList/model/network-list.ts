import { combine, createEvent, createStore, sample, Store } from 'effector';

import { ExtendedChain, networkModel, networkUtils } from '@/src/renderer/entities/network';
import { getExtendedChain } from '../networks-list-utils';
import { includes } from '@shared/lib/utils';

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

const $activeChainsSorted: Store<ExtendedChain[]> = combine(
  {
    filteredNetworks: $networksFiltered,
    connectionStatuses: networkModel.$connectionStatuses,
    connections: networkModel.$connections,
  },
  ({ filteredNetworks, connectionStatuses, connections }) => {
    return getExtendedChain(filteredNetworks, connections, connectionStatuses).filter((o) =>
      networkUtils.isEnabledConnection(o.connection),
    );
  },
);

const $inactiveChainsSorted: Store<ExtendedChain[]> = combine(
  {
    filteredNetworks: $networksFiltered,
    connectionStatuses: networkModel.$connectionStatuses,
    connections: networkModel.$connections,
  },
  ({ filteredNetworks, connectionStatuses, connections }) => {
    return getExtendedChain(filteredNetworks, connections, connectionStatuses).filter((o) =>
      networkUtils.isDisabledConnection(o.connection),
    );
  },
);

export const networkListModel = {
  $activeChainsSorted,
  $inactiveChainsSorted,
  $networksFiltered,
  $filterQuery,
  events: {
    componentMounted,
    queryChanged,
  },
};
