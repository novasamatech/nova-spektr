import { sample } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';

export const COLLECTIVES_CHAIN_ID: ChainId = '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2';
export const COLLECTIVES_WESTEND_CHAIN_ID: ChainId =
  '0x713daf193a6301583ff467be736da27ef0a72711b248927ba413f573d2b38e44';
export const COLLECTIVES_NOVASAMA_CHAIN_ID: ChainId =
  '0xa35b4d0bf5767fcc3a4795aca93ef3b152c7c280d558d49eea535cae56a3a93e';
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
