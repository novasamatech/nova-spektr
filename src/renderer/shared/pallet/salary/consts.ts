import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { getPalletName } from './helpers';
import { type PalletType } from './types';

const getPallet = (api: ApiPromise, type: PalletType) => {
  const palletName = getPalletName(type);
  const pallet = api.consts[palletName];
  if (!pallet) {
    throw new TypeError(`${palletName} pallet not found`);
  }

  return pallet;
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
