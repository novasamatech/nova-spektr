import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type Address, type TrackId } from '@shared/core';
import { governanceService } from '@entities/governance';
import { accountUtils, walletModel } from '@entities/wallet';

import { networkSelectorModel } from './networkSelector';

const getTracksLocks = createEvent();

const $totalLock = createStore<BN>(BN_ZERO);
const $trackLocks = createStore<Record<Address, Record<TrackId, BN>>>({});
const $isLoading = createStore(true);

type Props = {
  api: ApiPromise;
  addresses: Address[];
};

const getTrackLocksFx = createEffect(({ api, addresses }: Props): Promise<Record<Address, Record<TrackId, BN>>> => {
  return governanceService.getTrackLocks(api, addresses);
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
  target: getTrackLocksFx,
});

sample({
  clock: getTrackLocksFx.doneData,
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
  clock: getTrackLocksFx.finally,
  fn: () => false,
  target: $isLoading,
});

export const locksModel = {
  $isLoading,
  $totalLock,
  $trackLocks,

  events: {
    requestDone: getTrackLocksFx.done,
    getTracksLocks,
  },
};
