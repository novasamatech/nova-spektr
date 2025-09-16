import { sample } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

export const COLLECTIVES_CHAIN_ID: ChainId = '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2';
export const COLLECTIVES_WESTEND_CHAIN_ID: ChainId =
  '0x713daf193a6301583ff467be736da27ef0a72711b248927ba413f573d2b38e44';
export const COLLECTIVES_NOVASAMA_CHAIN_ID: ChainId =
  '0xc84b77ebc80ef7413dbc04b6385b9ae7dff5811cfb2fd38025e67487389f666a';
const flow = createGate<{ chainId: ChainId }>();

// We want to show main fellowship on specific chain - Polkadot Collectives
sample({
  clock: flow.open,
  fn: () => ({ chainId: COLLECTIVES_CHAIN_ID }),
  target: fellowshipNetwork.selectCollective,
});

export const fellowshipPageModel = {
  gates: {
    flow,
  },
};
