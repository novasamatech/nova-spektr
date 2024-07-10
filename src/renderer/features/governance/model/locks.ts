import { spread } from 'patronum';
import { createStore, createEffect, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';

import type { Address, TrackId } from '@shared/core';
import { governanceService } from '@shared/api/governance';
import { accountUtils, walletModel } from '@entities/wallet';
import { networkSelectorModel } from './networkSelector';

const $totalLock = createStore<BN>(BN_ZERO);
const $trackLocks = createStore<Record<Address, Record<TrackId, BN>>>({});
const $isLoading = createStore(true).reset(networkSelectorModel.events.chainChanged || walletModel.$activeWallet);

type Props = {
  api: ApiPromise;
  addresses: Address[];
};

const getTrackLocksFx = createEffect(({ api, addresses }: Props): Promise<Record<Address, Record<TrackId, BN>>> => {
  return governanceService.getTrackLocks(api, addresses);
});

const $asset = networkSelectorModel.$governanceChain?.map((chain) => (chain && chain.assets[0]) || null);

sample({
  clock: [networkSelectorModel.$governanceChainApi, walletModel.$activeWallet],
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
    for (const address in trackLocks) {
      const lock = trackLocks[address];
      const totalLock = Object.values(lock).reduce<BN>((acc, lock) => (lock.gt(acc) ? lock : acc), BN_ZERO);

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
  $asset,
  $isLoading,
  $totalLock,
  $trackLocks,
};
