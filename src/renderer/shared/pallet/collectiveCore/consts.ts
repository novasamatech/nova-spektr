import { type PolkadotApi } from '@/domains/network';

import { getPalletName } from './helpers';
import { type PalletType } from './types';

const getPallet = (type: PalletType, papi: PolkadotApi) => {
  if (papi.type === 'dot_col') {
    return papi.api.constants[getPalletName(type)];
  }

  throw new TypeError(`Wrong chain - ${papi.type}. Only Collective chains able to make operations.`);
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
