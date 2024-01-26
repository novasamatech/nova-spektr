import type { ChainId } from '@shared/core';

export const stakingUtils = {
  isKusamaChainId,
};

function isKusamaChainId(chainId: ChainId): boolean {
  return chainId === '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
}
