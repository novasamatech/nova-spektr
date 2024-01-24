import type { ChainId, ID, Metadata } from './general';

export type ChainMetadata = {
  id: ID;
  chainId: ChainId;
  version: number;
  metadata: Metadata;
};
