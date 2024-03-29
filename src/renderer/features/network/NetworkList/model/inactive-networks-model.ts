import { createEvent, sample, createStore, combine } from 'effector';

import { networkUtils, networkModel } from '@entities/network';
import { Chain } from '@shared/core';
import { networksListUtils } from '../lib/networks-list-utils';

const networksChanged = createEvent<Chain[]>();

const $networks = createStore<Chain[]>([]);

const $inactiveNetworks = combine(
  {
    networks: $networks,
    statuses: networkModel.$connectionStatuses,
    connections: networkModel.$connections,
  },
  ({ networks, statuses, connections }) => {
    return networksListUtils
      .getExtendedChain(networks, connections, statuses)
      .filter((chain) => networkUtils.isDisabledConnection(chain.connection));
  },
);

sample({ clock: networksChanged, target: $networks });

export const inactiveNetworksModel = {
  $inactiveNetworks,

  events: {
    networksChanged,
  },
};
