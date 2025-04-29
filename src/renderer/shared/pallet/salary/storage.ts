import { zipWith } from 'lodash';
import { type SS58String } from 'polkadot-api';
import { z } from 'zod';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { toAddress } from '@/shared/lib/utils';
import { papiHelpers } from '@/shared/papi-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PolkadotApi } from '@/domains/network';

import { getPalletName } from './helpers';
import { salaryClaimantStatus, salaryStatusType } from './schema';
import { type PalletType } from './types';

const getQuery = (type: PalletType, papi: PolkadotApi) => {
  return papiHelpers.getTypedApis(papi, ['dot_col'], ({ api }) => {
    return api.query[getPalletName(type)];
  });
};

export const storage = {
  /**
   * The status of a claimant.
   */
  claimant: (type: PalletType, papi: PolkadotApi, accounts: AccountId[]) => {
    const schema = z.array(z.optional(salaryClaimantStatus));
    const addresses = accounts.map(a => [toAddress(a)] satisfies [SS58String]);

    return substrateRpcPool
      .call(() => getQuery(type, papi).Claimant.getValues(addresses))
      .then(schema.parse)
      .then(claimants => zipWith(claimants, accounts, (claim, account) => ({ account, claim })));
  },

  /**
   * The overall status of the system.
   */
  status: (type: PalletType, papi: PolkadotApi) => {
    const schema = z.optional(salaryStatusType);

    return substrateRpcPool.call(() => getQuery(type, papi).Status.getValue()).then(schema.parse);
  },
};
