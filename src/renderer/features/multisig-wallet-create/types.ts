import { type ChainId } from '@/shared/core';

export type FormParams = {
  threshold: number;
  chainId: ChainId;
  name: string;
};

export interface SignatoryInfo {
  index: number;
  name: string;
  address: string;
  // Contact doesn't belong to wallet
  walletId?: string;
}
