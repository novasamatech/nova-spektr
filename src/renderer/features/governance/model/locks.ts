import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import noop from 'lodash/noop';
import { spread } from 'patronum';

import { type Address, type TrackId } from '@shared/core';
import { governanceSubscribeService } from '@/entities/governance';
import { accountUtils, walletModel } from '@entities/wallet';

import { networkSelectorModel } from './networkSelector';

const getTracksLocks = createEvent();
const locksSet = createEvent<Record<Address, Record<TrackId, BN>>>();

const $totalLock = createStore<BN>(BN_ZERO);
const $isLoading = createStore(true);
const $locksUnsub = createStore<() => void>(noop);

const $trackLocks = restore(locksSet, {});

type Props = {
  api: ApiPromise;
  addresses: Address[];
};

const subscribeTrackLocksFx = createEffect(({ api, addresses }: Props): Promise<() => void> => {
  const boundLocksSet = scopeBind(locksSet, { safe: true });

  return governanceSubscribeService.subscribeTrackLocks(api, addresses, (locks) => {
    if (!locks) return;

    boundLocksSet(locks);
  });
});

sample({
  clock: [networkSelectorModel.$governanceChainApi, walletModel.$activeWallet],
  target: [getTracksLocks, $isLoading.reinit],
});

sample({
  clock: getTracksLocks,
  source: {
    chain: networkSelectorModel.$governanceChain,
    api: networkSelectorModel.$governanceChainApi,
    wallet: walletModel.$activeWallet,
  },
  filter: ({ chain, api, wallet }) => !!chain && !!api && !!wallet,
  fn: ({ api, chain, wallet }) => ({
    api: api!,
    addresses: accountUtils.getAddressesForWallet(wallet!, chain!),
  }),
  target: subscribeTrackLocksFx,
});

sample({
  clock: $trackLocks,
  fn: (trackLocks) => {
    let maxLockTotal = BN_ZERO;
    for (const lock of Object.values(trackLocks)) {
      const totalLock = Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);

      maxLockTotal = maxLockTotal.add(totalLock);
    }

    return { maxLockTotal, trackLocks };
  },
  target: spread({ maxLockTotal: $totalLock, trackLocks: $trackLocks }),
});

sample({
  clock: subscribeTrackLocksFx.doneData,
  target: $locksUnsub,
});

sample({
  clock: subscribeTrackLocksFx.finally,
  fn: () => false,
  target: $isLoading,
});

export const locksModel = {
  $isLoading,
  $totalLock,
  $trackLocks,
  $locksUnsub,

  events: {
    requestDone: subscribeTrackLocksFx.done,
    getTracksLocks,
  },
};
