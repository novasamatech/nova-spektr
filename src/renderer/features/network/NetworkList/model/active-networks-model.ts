import { createEvent, createStore, combine, sample } from 'effector';

import { networkUtils, networkModel } from '@entities/network';
import { Chain } from '@shared/core';
import { networksListUtils } from '../lib/networks-list-utils';

const networksChanged = createEvent<Chain[]>();

const $networks = createStore<Chain[]>([]);

const $activeNetworks = combine(
  {
    networks: $networks,
    statuses: networkModel.$connectionStatuses,
    connections: networkModel.$connections,
  },
  ({ networks, statuses, connections }) => {
    return networksListUtils
      .getExtendedChain(networks, connections, statuses)
      .filter((chain) => networkUtils.isEnabledConnection(chain.connection));
  },
);

sample({ clock: networksChanged, target: $networks });

export const activeNetworksModel = {
  $activeNetworks,

  events: {
    networksChanged,
  },
};
