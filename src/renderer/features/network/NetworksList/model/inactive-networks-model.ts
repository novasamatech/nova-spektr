import { createEvent, sample, createStore, combine } from 'effector';

import { networkUtils, networkModel } from '@entities/network';
import { Chain } from '@shared/core';
import { networksListUtils } from '../lib/networks-list-utils';

const networksChanged = createEvent<Chain[]>();

const $networks = createStore<Chain[]>([]);

const $inactiveNetworks = combine(
  {
    networks: $networks,
    connectionStatuses: networkModel.$connectionStatuses,
    connections: networkModel.$connections,
  },
  ({ networks, connectionStatuses, connections }) => {
    return networksListUtils
      .getExtendedChain(networks, connections, connectionStatuses)
      .filter((o) => networkUtils.isDisabledConnection(o.connection));
  },
);

sample({ clock: networksChanged, target: $networks });

export const inactiveNetworksModel = {
  $inactiveNetworks,
  events: {
    networksChanged,
  },
};
