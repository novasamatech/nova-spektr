import { zipWith } from 'lodash';
import { type SS58String } from 'polkadot-api';
import { z } from 'zod';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { papiHelpers } from '@/shared/papi-helpers';
import { type AccountId } from '@/shared/papi-schemas';
import { type PolkadotApi } from '@/domains/network';

import { getPalletName } from './helpers';
import { collectiveCoreMemberEvidence, collectiveCoreMemberStatus, collectiveCoreParams } from './schema';
import { type PalletType } from './types';

const getQuery = (type: PalletType, papi: PolkadotApi) => {
  return papiHelpers.getTypedApis(papi, ['dot_col'], ({ api }) => {
    return api.query[getPalletName(type)];
  });
};

export const storage = {
  /**
   * The overall status of the system.
   */
  params(type: PalletType, papi: PolkadotApi) {
    return substrateRpcPool.call(() => getQuery(type, papi).Params.getValue().then(collectiveCoreParams.parse));
  },

  /**
   * The status of a claimant.
   */
  member(type: PalletType, papi: PolkadotApi) {
    const schema = z.array(
      z
        .object({
          keyArgs: z.tuple([z.string()]).transform(a => toAccountId(a[0])),
          value: collectiveCoreMemberStatus,
        })
        .transform(({ keyArgs, value }) => ({ account: keyArgs, status: value })),
    );

    return substrateRpcPool.call(() => getQuery(type, papi).Member.getEntries().then(schema.parse));
  },

  /**
   * Some evidence together with the desired outcome for which it was presented.
   */
  memberEvidence(type: PalletType, papi: PolkadotApi, accounts: AccountId[]) {
    const schema = z.array(z.optional(collectiveCoreMemberEvidence));
    const addresses = accounts.map(a => [toAddress(a)] satisfies [SS58String]);

    return substrateRpcPool
      .call(() => getQuery(type, papi).MemberEvidence.getValues(addresses))
      .then(schema.parse)
      .then(evidences => zipWith(accounts, evidences, (account, evidence) => ({ account, evidence })));
  },
};
