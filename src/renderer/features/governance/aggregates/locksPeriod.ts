import { type ApiPromise } from '@polkadot/api';
import { createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { lockPeriodsModel } from '../model/lockPeriods';
import { networkSelectorModel } from '../model/networkSelector';

const flow = createGate<{ chain?: Chain }>();

const $network = createStore<{ chain: Chain; api: ApiPromise } | null>(null).reset(flow.close);

sample({
  clock: networkSelectorModel.$network,
  filter: nonNullable,
  target: $network,
});

// When Confirmation screen opens, the chain may not be available at flow.open.
sample({
  clock: flow.state,
  source: networkModel.$apis,
  filter: (apis, { chain }) => {
    return nonNullable(chain) && chain.chainId in apis;
  },
  fn: (apis, { chain }) => ({
    api: apis[chain!.chainId],
    chain: chain!,
  }),
  target: $network,
});

sample({
  clock: $network,
  filter: nonNullable,
  target: lockPeriodsModel.events.requestLockPeriods,
});

export const locksPeriodsAggregate = {
  gates: {
    flow,
  },
};
