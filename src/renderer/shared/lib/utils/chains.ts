import { ChainId } from '@renderer/domain/shared-kernel';

export const toLocalChainId = (chainId?: ChainId): string | undefined => {
  return chainId?.replace('0x', '');
};
