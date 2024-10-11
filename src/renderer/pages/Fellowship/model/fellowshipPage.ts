import { sample } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';

export const COLLECTIVES_CHAIN_ID: ChainId = '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2';
export const COLLECTIVES_WESTEND_CHAIN_ID: ChainId =
  '0x1eb6fb0ba5187434de017a70cb84d4f47142df1d571d0ef9e7e1407f2b80b93c';

const flow = createGate<{ chainId: ChainId }>();

// We want to show main fellowship on specific chain - Polkadot Collectives
sample({
  clock: flow.open,
  fn: () => ({ chainId: COLLECTIVES_CHAIN_ID }),
  target: fellowshipNetworkFeature.model.network.selectCollective,
});

export const fellowshipPageModel = {
  gates: {
    flow,
  },
};
