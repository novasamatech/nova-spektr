import { Store, combine } from 'effector';

import { ExtendedChain, networkModel, networkUtils } from '@/src/renderer/entities/network';
import { filterModel } from '../../NetworkFilter';
import { getExtendedChain } from '../networks-list-utils';

const $activeChainsSorted: Store<ExtendedChain[]> = combine(
  {
    filteredNetworks: filterModel.$networksFiltered,
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
    filteredNetworks: filterModel.$networksFiltered,
    connectionStatuses: networkModel.$connectionStatuses,
    connections: networkModel.$connections,
  },
  ({ filteredNetworks, connectionStatuses, connections }) => {
    return getExtendedChain(filteredNetworks, connections, connectionStatuses).filter((o) =>
      networkUtils.isDisabledConnection(o.connection),
    );
  },
);

export const networkListModel = { $activeChainsSorted, $inactiveChainsSorted };
