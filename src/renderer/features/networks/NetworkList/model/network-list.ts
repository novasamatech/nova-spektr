import { combine, createEvent, createStore, sample, Store } from 'effector';

import { ExtendedChain, networkModel, networkUtils } from '@/src/renderer/entities/network';
import { getExtendedChain } from '../networks-list-utils';
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

const $activeChainsSorted: Store<ExtendedChain[]> = combine(
  {
    filteredNetworks: $filteredNetworks,
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
    filteredNetworks: $filteredNetworks,
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
  $filterQuery,
  events: {
    formInitiated,
    queryChanged,
  },
};
