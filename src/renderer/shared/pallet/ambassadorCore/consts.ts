import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

const getPallet = (api: ApiPromise) => {
  const pallet = api.consts['ambassadorCore'];
  if (!pallet) {
    throw new TypeError('ambassadorCore pallet not found');
  }

  return pallet;
};

export const consts = {
  /**
   * The maximum size in bytes submitted evidence is allowed to be.
   */
  evidenceSize(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['evidenceSize']);
  },
};
