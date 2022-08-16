import { ChainId, PublicKey } from './shared-kernel';

export type Balance = {
  chainId: ChainId;
  publicKey: PublicKey;
  assetId: string;
  verified: boolean;
  free: string;
  reserved: string;
  frozen: string;
};
