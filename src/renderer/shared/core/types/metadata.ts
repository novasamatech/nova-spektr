import type { ChainId, HexString } from './general';

export type Metadata = {
  chainId: ChainId;
  version: number;
  metadata?: HexString;
};
