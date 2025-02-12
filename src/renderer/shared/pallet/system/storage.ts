import { type ApiPromise } from '@polkadot/api';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

const getQuery = (api: ApiPromise, name: string) => {
  const pallet = api.query['system'];
  if (!pallet) {
    throw new TypeError(`system pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = pallet[name];

  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const storage = {
  /**
   * The full account information for a particular account ID.
   */
  account(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * Total length (in bytes) for all extrinsics put together, for the current
   * block.
   */
  allExtrinsicsLen(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * `Some` if a code upgrade has been authorized.
   */
  authorizedUpgrade(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * Map of block numbers to block hashes.
   */
  blockHash(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * The current weight for the block.
   */
  blockWeight(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * Digest of the current block, also part of the block header.
   */
  digest(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * The number of events in the `Events<T>` list.
   */
  eventCount(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * Events deposited for the current block.
   *
   * NOTE: The item is unbound and should therefore never be read on chain. It
   * could otherwise inflate the PoV size of a block.
   *
   * Events have a large in-memory size. Box the events to not go out-of-memory
   * just in case someone still reads them from within the runtime.
   */
  events(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * Mapping between a topic (represented by T::Hash) and a vector of indexes of
   * events in the `<Events<T>>` list.
   *
   * All topic vectors have deterministic storage locations depending on the
   * topic. This allows light-clients to leverage the changes trie storage
   * tracking mechanism and in case of changes fetch the list of events of
   * interest.
   *
   * The value has the type `(BlockNumberFor<T>, EventIndex)` because if we used
   * only just the `EventIndex` then in case if the topic has the same contents
   * on the next block no notification will be triggered thus the event might be
   * lost.
   */
  eventTopics(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * The execution phase of the block.
   */
  executionPhase(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * Total extrinsics count for the current block.
   */
  extrinsicCount(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * Extrinsics data for the current block (maps an extrinsic's index to its
   * data).
   */
  extrinsicData(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * Whether all inherents have been applied.
   */
  inherentsApplied(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * Stores the `spec_version` and `spec_name` of when the last runtime upgrade
   * happened.
   */
  lastRuntimeUpgrade(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * The current block number being processed. Set by `execute_block`.
   */
  number(api: ApiPromise) {
    return substrateRpcPool.call(() => getQuery(api, 'number')()).then(pjsSchema.blockHeight.parse);
  },

  /**
   * Hash of the previous block.
   */
  parentHash(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * True if we have upgraded so that AccountInfo contains three types of
   * `RefCount`. False (default) if not.
   */
  upgradedToTripleRefCount(_api: ApiPromise) {
    throw new Error('Not implemented');
  },

  /**
   * True if we have upgraded so that `type RefCount` is `u32`. False (default)
   * if not.
   */
  upgradedToU32RefCount(_api: ApiPromise) {
    throw new Error('Not implemented');
  },
};
