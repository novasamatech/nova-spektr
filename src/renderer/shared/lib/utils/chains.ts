import { ChainId } from '@renderer/domain/shared-kernel';

export const toLocalChainId = (chainId?: ChainId): string | undefined => {
  return chainId?.replace('0x', '');
};

export const toHexChainId = (chainId?: string): ChainId | undefined => {
  return `0x${chainId?.replace('0x', '')}`;
};
