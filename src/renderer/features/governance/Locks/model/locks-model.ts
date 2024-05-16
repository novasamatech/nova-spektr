import { createStore, createEffect, sample, createEvent, restore, combine } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { spread } from 'patronum';

import { TrackLock, ChainId } from '@shared/core';
import { governanceService } from '@shared/api/governance';
import { networkModel } from '@entities/network';

const chainIdChanged = createEvent<ChainId>();

const $maxLock = createStore<BN>(BN_ZERO);
const $chainId = restore(chainIdChanged, null);
const $isLocksRequested = createStore(false).reset(chainIdChanged);
const $isLoading = createStore(true).reset(chainIdChanged);

const getClassLocksFx = createEffect((api: ApiPromise): Promise<TrackLock[]> => {
  // return governanceService.getClassLocks(api, '12mP4sjCfKbDyMRAEyLpkeHeoYtS5USY4x34n9NMwQrcEyoh');
  return governanceService.getClassLocks(api, '153YD8ZHD9dRh82U419bSCB5SzWhbdAFzjj4NtA5pMazR2yC');
});

const $asset = combine(
  {
    chainId: $chainId,
    chains: networkModel.$chains,
  },
  ({ chainId, chains }) => {
    return (chainId && chains[chainId].assets[0]) || null;
  },
);

const $api = combine(
  {
    chainId: $chainId,
    apis: networkModel.$apis,
  },
  ({ chainId, apis }) => {
    return (chainId && apis[chainId]) || null;
  },
);

sample({
  clock: $api.updates,
  source: $isLocksRequested,
  filter: (isLocksRequested, api) => !isLocksRequested && Boolean(api),
  fn: (_, api) => api!,
  target: getClassLocksFx,
});

sample({
  clock: getClassLocksFx.doneData,
  fn: (trackLocks) => {
    const locks = trackLocks.reduce<BN>((acc, { lock }) => (lock.gt(acc) ? lock : acc), BN_ZERO);

    return { locks, requested: true };
  },
  target: spread({
    locks: $maxLock,
    requested: $isLocksRequested,
  }),
});

sample({
  clock: getClassLocksFx.finally,
  fn: () => false,
  target: $isLoading,
});

export const locksModel = {
  $maxLock,
  $asset,
  $isLoading,

  events: {
    chainIdChanged,
  },
};
