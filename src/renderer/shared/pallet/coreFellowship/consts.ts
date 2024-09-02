import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjsSchemas';

const getPallet = (api: ApiPromise) => {
  const coreFellowship = api.consts['coreFellowship'];
  if (!coreFellowship) {
    throw new TypeError('coreFellowship pallet not found');
  }

  return coreFellowship;
};

export const consts = {
  /**
   * The maximum size in bytes submitted evidence is allowed to be.
   */
  evidenceSize(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['evidenceSize']);
  },
};
