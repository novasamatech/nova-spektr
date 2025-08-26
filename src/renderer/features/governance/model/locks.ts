import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Chain, type ChainId, type TrackLocks } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createSubscriber, governanceService, governanceSubscribeService } from '@/entities/governance';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

import { networkSelectorModel } from './networkSelector';

const requestLocks = createEvent<{ api: ApiPromise; chain: Chain; accounts: AccountId[] }>();
const subscribeLocks = createEvent();

const $trackLocks = createStore<Record<ChainId, TrackLocks>>({}).reset(walletSelect.$selectedWallet);

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

      maxLockTotal = maxLockTotal.add(totalLock);
    }

    return maxLockTotal;
  },
);

const $isLoading = createStore(true);

const $walletAccounts = combine(
  {
    wallet: walletSelect.$selectedWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ wallet, chain }) => {
    if (!wallet || !chain) return [];

    return accountUtils.getAccountsIdsForWallet(wallet, chain);
  },
);

type RequestParams = {
  api: ApiPromise;
  chain: Chain;
  accounts: AccountId[];
};

const requestLocksFx = createEffect(({ api, accounts }: RequestParams) => {
  return governanceService.getTrackLocks(api, accounts);
});

const {
  subscribe,
  received: receiveLocks,
  unsubscribe: unsubscribeLocks,
} = createSubscriber<RequestParams, TrackLocks>(({ api, accounts }, cb) => {
  return governanceSubscribeService.subscribeTrackLocks(api, accounts, (locks) => {
    if (locks) cb(locks);
  });
});

sample({
  clock: [networkSelectorModel.$network, $walletAccounts],
  target: subscribeLocks,
});

sample({
  clock: subscribeLocks,
  source: {
    network: networkSelectorModel.$network,
    accounts: $walletAccounts,
  },
  filter: ({ network }) => nonNullable(network),
  fn: ({ network, accounts }) => ({ api: network!.api, chain: network!.chain, accounts }),
  target: subscribe,
});

sample({
  clock: requestLocks,
  fn: ({ chain, api, accounts }) => ({ api, chain, accounts }),
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
  fn: (trackLocks, { params, result }) => ({
    ...trackLocks,
    [params.chain.chainId]: result,
  }),
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
