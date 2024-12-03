import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Address, type Chain, type ChainId, type TrackId } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { createSubscriber, governanceService, governanceSubscribeService } from '@/entities/governance';
import { accountUtils, walletModel } from '@/entities/wallet';

import { networkSelectorModel } from './networkSelector';

const requestLocks = createEvent<{ api: ApiPromise; chain: Chain; addresses: Address[] }>();
const subscribeLocks = createEvent();

const $trackLocks = createStore<Record<ChainId, Record<Address, Record<TrackId, BN>>>>({}).reset(
  walletModel.$activeWallet,
);

const $totalLock = combine(
  {
    chainId: networkSelectorModel.$governanceChainId,
    trackLocks: $trackLocks,
  },
  ({ chainId, trackLocks }) => {
    if (nullable(chainId)) return BN_ZERO;

    let maxLockTotal = new BN(0);
    const tracksLocksForChain = trackLocks[chainId];

    if (!tracksLocksForChain) {
      return maxLockTotal;
    }

    for (const lock of Object.values(tracksLocksForChain)) {
      const totalLock = Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);
      maxLockTotal = maxLockTotal.iadd(totalLock);
    }

    return maxLockTotal;
  },
);

const $isLoading = createStore(true);

const $walletAddresses = combine(
  {
    wallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ wallet, chain }) => {
    if (!wallet || !chain) return [];

    return accountUtils.getAddressesForWallet(wallet, chain);
  },
);

type RequestParams = {
  api: ApiPromise;
  chain: Chain;
  addresses: Address[];
};

const requestLocksFx = createEffect(({ api, addresses }: RequestParams) => {
  return governanceService.getTrackLocks(api, addresses);
});

const {
  subscribe,
  received: receiveLocks,
  unsubscribe: unsubscribeLocks,
} = createSubscriber<RequestParams, Record<Address, Record<TrackId, BN>>>(({ api, addresses }, cb) => {
  return governanceSubscribeService.subscribeTrackLocks(api, addresses, (locks) => {
    if (locks) cb(locks);
  });
});

sample({
  clock: [networkSelectorModel.$network, $walletAddresses],
  target: subscribeLocks,
});

sample({
  clock: subscribeLocks,
  source: {
    network: networkSelectorModel.$network,
    addresses: $walletAddresses,
  },
  filter: ({ network }) => nonNullable(network),
  fn: ({ network, addresses }) => ({ api: network!.api, chain: network!.chain, addresses }),
  target: subscribe,
});

sample({
  clock: requestLocks,
  fn: ({ chain, api, addresses }) => ({ api, chain, addresses }),
  target: requestLocksFx,
});

sample({
  clock: subscribeLocks,
  source: { trackLocks: $trackLocks, network: networkSelectorModel.$network },
  filter: ({ trackLocks, network }) => nonNullable(network) && nullable(trackLocks[network.chain.chainId]),
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: receiveLocks,
  fn: () => false,
  target: $isLoading,
});

sample({
  clock: requestLocksFx.pending,
  source: { trackLocks: $trackLocks, network: networkSelectorModel.$network },
  filter: ({ trackLocks, network }) => nonNullable(network) && nullable(trackLocks[network.chain.chainId]),
  fn: (_, loading) => loading,
  target: $isLoading,
});

sample({
  clock: [receiveLocks, requestLocksFx.done],
  source: $trackLocks,
  fn: (trackLocks, { params, result }) => {
    return { ...trackLocks, [params.chain.chainId]: result };
  },
  target: $trackLocks,
});

export const locksModel = {
  $isLoading,
  $totalLock: readonly($totalLock),
  $trackLocks: readonly($trackLocks),
  events: {
    requestLocks,
    subscribeLocks,
    unsubscribeLocks,
  },
};
