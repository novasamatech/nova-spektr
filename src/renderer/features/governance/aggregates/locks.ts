import { type ApiPromise } from '@polkadot/api';
import { combine, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel } from '@/entities/wallet';
import { locksModel } from '../model/locks';
import { networkSelectorModel } from '../model/networkSelector';

const flow = createGate<{ chain?: Chain }>();

const $network = createStore<{ chain: Chain; api: ApiPromise } | null>(null);

const $trackLocksForChain = combine($network, locksModel.$trackLocks, (network, trackLocks) => {
  if (!network) return {};

  return trackLocks[network.chain.chainId] ?? {};
});

sample({
  clock: networkSelectorModel.$network,
  filter: nonNullable,
  target: $network,
});

sample({
  clock: flow.open,
  source: networkModel.$apis,
  filter: (apis, { chain }) => {
    return nonNullable(chain) && chain.chainId in apis;
  },
  fn: (apis, { chain }) => ({
    chain: chain!,
    api: apis[chain!.chainId],
  }),
  target: $network,
});

sample({
  clock: flow.open,
  source: { apis: networkModel.$apis, wallet: walletModel.$activeWallet },
  filter: ({ apis, wallet }, { chain }) => {
    return nonNullable(chain) && chain.chainId in apis && nonNullable(wallet);
  },
  fn: ({ apis, wallet }, { chain }) => ({
    api: apis[chain!.chainId],
    chain: chain!,
    addresses: accountUtils.getAddressesForWallet(wallet!, chain!),
  }),
  target: locksModel.events.requestLocks,
});

export const locksAggregate = {
  $trackLocks: $trackLocksForChain,
  $totalLock: locksModel.$totalLock,
  $isLoading: locksModel.$isLoading,

  events: {
    requestLocks: locksModel.events.requestLocks,
  },

  gates: {
    flow,
  },
};
