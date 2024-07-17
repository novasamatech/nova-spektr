import { combine, createEvent, createStore, sample } from 'effector';

import { type Chain } from '@shared/core';

import { networkModel, networkUtils } from '@entities/network';

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
      .filter((chain) => chain.connection && networkUtils.isEnabledConnection(chain.connection));
  },
);

sample({ clock: networksChanged, target: $networks });

export const activeNetworksModel = {
  $activeNetworks,

  events: {
    networksChanged,
  },
};
