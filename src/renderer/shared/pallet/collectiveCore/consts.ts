import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { getPalletName } from './helpers';
import { type PalletType } from './types';

const getPallet = (type: PalletType, api: ApiPromise) => {
  const name = getPalletName(type);
  const pallet = api.consts[name];

  if (!pallet) {
    throw new TypeError(`${name} pallet not found`);
  }

  return pallet;
};

export const consts = {
  /**
   * The maximum size in bytes submitted evidence is allowed to be.
   */
  evidenceSize(type: PalletType, api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(type, api)['evidenceSize']);
  },

  /**
   * Represents the highest possible rank in this pallet.
   */
  maxRank(type: PalletType, api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(type, api)['maxRank']);
  },
};
