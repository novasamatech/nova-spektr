import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

const getPallet = (api: ApiPromise) => {
  const pallet = api.consts['multisig'];
  if (!pallet) {
    throw new TypeError('multisig pallet not found');
  }

  return pallet;
};

export const consts = {
  /**
   * The base amount of currency needed to reserve for creating a multisig
   * execution or to store a dispatch call for later.
   */
  depositBase(api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(api)['depositBase']);
  },

  /**
   * The amount of currency needed per unit threshold when creating a multisig
   * execution.
   */
  depositFactor(api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(api)['depositFactor']);
  },

  /**
   * The maximum amount of signatories allowed in the multisig.
   */
  maxSignatories(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxSignatories']);
  },
};
