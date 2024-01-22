import type { ChainId, HexString, ID } from './general';

export type Metadata = {
  id: ID;
  chainId: ChainId;
  version: number;
  metadata?: HexString;
};
