import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { systemLimitsBlockLength, systemLimitsBlockWeights } from './schema';

const getPallet = (api: ApiPromise) => {
  const pallet = api.consts['system'];
  if (!pallet) {
    throw new TypeError('system pallet not found');
  }

  return pallet;
};

export const consts = {
  /**
   * Maximum number of block number to block hash mappings to keep (oldest
   * pruned first).
   */
  blockHashCount(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['blockHashCount']);
  },

  /**
   * The maximum length of a block (in bytes).
   */
  blockLength(api: ApiPromise) {
    return systemLimitsBlockLength.parse(getPallet(api)['blockLength']);
  },

  /**
   * Block & extrinsics weights: base values and limits.
   */
  blockWeights(api: ApiPromise) {
    return systemLimitsBlockWeights.parse(getPallet(api)['blockWeights']);
  },

  /**
   * The weight of runtime database operations the runtime can invoke.
   */
  dbWeight(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * The designated SS58 prefix of this chain.
   *
   * This replaces the "ss58Format" property declared in the chain spec. Reason
   * is that the runtime should know about the prefix in order to make use of it
   * as an identifier of the chain.
   */
  ss58Prefix(api: ApiPromise) {
    return pjsSchema.u16.parse(getPallet(api)['ss58Prefix']);
  },

  /**
   * Get the chain's in-code version.
   */
  version(_api: ApiPromise) {
    throw new Error('Not implemented');
  },
};
