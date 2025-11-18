import { type ApiPromise } from '@polkadot/api';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';

import { getPalletName } from './helpers';
import { type SalaryClaimantStatus, salaryClaimantStatus, salaryStatusType } from './schema';
import { type PalletType } from './types';

const getQuery = (type: PalletType, api: ApiPromise, name: string) => {
  const palletName = getPalletName(type);
  const root = api.query[palletName];
  if (!root) {
    throw new TypeError(`${palletName} pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = root[name];
  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const storage = {
  /**
   * The status of a claimant.
   */
  claimant: (type: PalletType, api: ApiPromise, accounts: AccountId[]) => {
    const schema = pjsSchema.vec(pjsSchema.optional(salaryClaimantStatus));

    return substrateRpcPool.call(() => getQuery(type, api, 'claimant').multi(accounts)).then(schema.parse);
  },

  /**
   * The status of a claimant.
   */
  claimantWatch: (
    type: PalletType,
    api: ApiPromise,
    accounts: AccountId[],
    callback: (v: (SalaryClaimantStatus | null)[]) => void,
  ) => {
    const schema = pjsSchema.vec(pjsSchema.optional(salaryClaimantStatus));

    return getQuery(type, api, 'claimant').multi(accounts, data => callback(schema.parse(data)));
  },

  /**
   * The overall status of the system.
   */
  status: (type: PalletType, api: ApiPromise) => {
    const schema = pjsSchema.optional(salaryStatusType);

    return substrateRpcPool.call(() => getQuery(type, api, 'status')()).then(schema.parse);
  },
};
