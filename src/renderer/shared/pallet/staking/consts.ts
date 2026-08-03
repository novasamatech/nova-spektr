import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

const getPallet = (api: ApiPromise) => {
  const pallet = api.consts['staking'];
  if (!pallet) {
    throw new TypeError('staking pallet not found');
  }

  return pallet;
};

export const consts = {
  /**
   * Number of eras to keep in history.
   */
  historyDepth(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['historyDepth']);
  },

  /**
   * Number of eras that staked funds must remain bonded for.
   */
  bondingDuration(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['bondingDuration']);
  },

  /**
   * Number of sessions per era.
   */
  sessionsPerEra(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['sessionsPerEra']);
  },

  /**
   * The maximum size of each `T::ExposurePage`.
   */
  maxExposurePageSize(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxExposurePageSize']);
  },

  /**
   * Number of eras that slashes are deferred by, after computation.
   */
  slashDeferDuration(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['slashDeferDuration']);
  },

  /**
   * The maximum number of `unlocking` chunks a `StakingLedger` can have.
   */
  maxUnlockingChunks(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxUnlockingChunks']);
  },

  /**
   * The maximum number of nominations per nominator. Absent on some runtimes.
   */
  maxNominations(api: ApiPromise) {
    const value = getPallet(api)['maxNominations'];

    return value ? pjsSchema.u32.parse(value) : null;
  },
};
