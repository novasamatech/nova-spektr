import { sample } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { type CollectivePalletsType } from '@/domains/collectives/lib/types';
import { fellowshipNetworkAggregate } from '@/features/fellowship/network/aggregates/fellowshipNetwork';

const COLLECTIVES_CHAIN_ID: ChainId = '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2';

const flow = createGate<{ chainId: ChainId }>();

// We want to show main fellowship on specific chain - Polckadot Collectives
sample({
  clock: flow.open,
  fn: () => ({ chainId: COLLECTIVES_CHAIN_ID, palletType: 'fellowship' as CollectivePalletsType }),
  target: fellowshipNetworkAggregate.events.selectCollective,
});

export const fellowshipPageAggregate = {
  gates: {
    flow,
  },
};
