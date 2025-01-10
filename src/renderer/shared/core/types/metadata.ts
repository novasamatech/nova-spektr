import { type ChainId, type ID, type Metadata } from './general';

/**
 * TODO: id doesn't exist in DB, need to update schema but you can't upgrade
 * primary key that easy - solution:
 * https://github.com/dexie/Dexie.js/issues/646#issuecomment-359460164
 */
export type ChainMetadata = {
  id: ID;
  chainId: ChainId;
  runtimeVersion: number;
  metadataVersion: number;
  metadata: Metadata;
};
