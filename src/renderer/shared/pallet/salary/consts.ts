import { papiHelpers } from '@/shared/papi-helpers';
import { papiSchema } from '@/shared/papi-schemas';
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
   * The total budget per cycle.
   */
  budget: (type: PalletType, papi: PolkadotApi) => {
    return papiSchema.bigNumber.parse(getPallet(type, papi).Budget);
  },

  /**
   * The number of blocks within a cycle which accounts have to claim the
   * payout.
   */
  payoutPeriod: (type: PalletType, papi: PolkadotApi) => {
    return papiSchema.blockHeight.parse(getPallet(type, papi).PayoutPeriod);
  },

  /**
   * The number of blocks within a cycle which accounts have to register their
   * intent to.
   */
  registrationPeriod: (type: PalletType, papi: PolkadotApi) => {
    return papiSchema.blockHeight.parse(getPallet(type, papi).RegistrationPeriod);
  },
};
