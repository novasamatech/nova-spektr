import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjsSchemas';

import { type PalletType } from './types';

const getPallet = (api: ApiPromise, type: PalletType) => {
  const name = type + 'Salary';

  const salary = api.consts[name];
  if (!salary) {
    throw new TypeError(`${name} pallet not found`);
  }

  return salary;
};

export const consts = {
  /**
   * The total budget per cycle.
   */
  budget: (type: PalletType, api: ApiPromise) => {
    return pjsSchema.u128.parse(getPallet(api, type)['budget']);
  },

  /**
   * The number of blocks within a cycle which accounts have to claim the
   * payout.
   */
  payoutPeriod: (type: PalletType, api: ApiPromise) => {
    return pjsSchema.u32.parse(getPallet(api, type)['payoutPeriod']);
  },

  /**
   * The number of blocks within a cycle which accounts have to register their
   * intent to.
   */
  registrationPeriod: (type: PalletType, api: ApiPromise) => {
    return pjsSchema.u32.parse(getPallet(api, type)['registrationPeriod']);
  },
};
