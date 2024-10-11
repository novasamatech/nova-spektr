import { type ApiPromise } from '@polkadot/api';
import { z } from 'zod';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type TrackId } from '@/shared/pallet/referenda';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { getPalletName } from './helpers';
import { treasuryProposal, treasurySpendStatus } from './schema';
import { type PalletType } from './types';

const getQuery = (type: PalletType, api: ApiPromise, name: string) => {
  const palletName = getPalletName(type);
  const pallet = api.query[palletName];
  if (!pallet) {
    throw new TypeError(`${palletName} pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = pallet[name];
  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const storage = {
  /**
   * Proposal indices that have been approved but not yet awarded.
   */
  approvals(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.vec(pjsSchema.u32);

    return substrateRpcPool.call(() => getQuery(type, api, 'approvals')()).then(schema.parse);
  },

  /**
   * The amount which has been reported as inactive to Currency.
   */
  deactivated(type: PalletType, api: ApiPromise) {
    return substrateRpcPool.call(() => getQuery(type, api, 'deactivated')()).then(pjsSchema.u128.parse);
  },

  /**
   * Number of proposals that have been made.
   */
  proposalCount(type: PalletType, api: ApiPromise) {
    return substrateRpcPool.call(() => getQuery(type, api, 'proposalCount')()).then(pjsSchema.u32.parse);
  },

  /**
   * Proposals that have been made.
   */
  proposals(type: PalletType, api: ApiPromise, tracks: TrackId[]) {
    const schema = pjsSchema.tupleMap(
      ['track', pjsSchema.storageKey(pjsSchema.u32).transform(x => x[0])],
      ['proposals', pjsSchema.vec(pjsSchema.optional(treasuryProposal))],
    );

    return substrateRpcPool.call(() => getQuery(type, api, 'proposals').entries(tracks)).then(schema.parse);
  },

  /**
   * The count of spends that have been made.
   */
  spendCount(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.tupleMap(['key', pjsSchema.storageKey(z.undefined())], ['spendCount', pjsSchema.u32]);

    return substrateRpcPool.call(() => getQuery(type, api, 'spendCount').entries()).then(schema.parse);
  },

  /**
   * Spends that have been approved and being processed.
   */
  spends(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.tupleMap(
      // TODO what is this?
      ['key', pjsSchema.storageKey(pjsSchema.u32)],
      ['spendCount', pjsSchema.optional(treasurySpendStatus)],
    );

    return substrateRpcPool.call(() => getQuery(type, api, 'spends').entries()).then(schema.parse);
  },
};
