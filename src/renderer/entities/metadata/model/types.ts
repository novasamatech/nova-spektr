import { ChainId, HexString } from '@renderer/domain/shared-kernel';

export type Metadata = {
  chainId: ChainId;
  metadataVersion: number;
  metadata: HexString;
};
