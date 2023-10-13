import { ChainId } from '@renderer/shared/core';

export const toLocalChainId = (chainId?: ChainId): string | undefined => {
  return chainId?.replace('0x', '');
};

export const toHexChainId = (chainId?: string): ChainId | undefined => {
  return `0x${chainId?.replace('0x', '')}`;
};
