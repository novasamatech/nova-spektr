import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain } from '@/shared/core';
import { nonNullable } from '@shared/lib/utils';
import { networkModel } from '@entities/network';
import { lockPeriodsModel } from '../model/lockPeriods';
import { networkSelectorModel } from '../model/networkSelector';

const lockPeriodsFetch = createGate<{ chain?: Chain }>();

const $lockPeriodsInChain = combine(
  networkSelectorModel.$governanceNetwork,
  lockPeriodsModel.$lockPeriods,
  (network, locks) => {
    if (!network) return null;

    return locks[network.chain.chainId];
  },
);

const requestLockPeriods = createEvent();

sample({
  clock: requestLockPeriods,
  source: networkSelectorModel.$governanceNetwork,
  filter: nonNullable,
  target: lockPeriodsModel.events.requestLockPeriods,
});

sample({
  clock: networkSelectorModel.$governanceNetwork,
  filter: nonNullable,
  target: requestLockPeriods,
});

sample({
  clock: lockPeriodsFetch.open,
  source: networkModel.$apis,
  filter: (apis, { chain }) => {
    return nonNullable(chain) && chain.chainId in apis;
  },
  fn: (apis, { chain }) => ({
    api: apis[chain!.chainId],
    chain: chain!,
  }),
  target: requestLockPeriods,
});

export const locksPeriodsAggregate = {
  $lockPeriods: $lockPeriodsInChain,
  $isLoading: lockPeriodsModel.$isLoading,

  events: {
    requestLockPeriods,
  },

  gates: {
    fetch: lockPeriodsFetch,
  },
};
