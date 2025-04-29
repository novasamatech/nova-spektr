import { papiHelpers } from '@/shared/papi-helpers';
import { type PolkadotApi } from '@/domains/network';

import { getPalletName } from './helpers';
import { type PalletType } from './types';

const getPallet = (type: PalletType, papi: PolkadotApi) => {
  return papiHelpers.getTypedApis(papi, ['dot_col'], ({ api }) => {
    return api.constants[getPalletName(type)];
  });
};

export const consts = {
  /**
   * The maximum size in bytes submitted evidence is allowed to be.
   */
  evidenceSize(type: PalletType, papi: PolkadotApi) {
    return getPallet(type, papi).EvidenceSize();
  },

  /**
   * Represents the highest possible rank in this pallet.
   */
  maxRank(type: PalletType, papi: PolkadotApi) {
    return getPallet(type, papi).MaxRank();
  },
};
