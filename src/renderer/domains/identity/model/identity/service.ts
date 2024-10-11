import { type Chain, type ChainId } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';

const findIdentityChain = (chains: Record<ChainId, Chain>, initialChainId: ChainId) => {
  let chainId = initialChainId;
  let chain = chains[initialChainId];
  let identityChain: Chain | null = null;

  if (nullable(chain)) {
    return null;
  }

  while (nullable(identityChain)) {
    if (chain.parentId) {
      chainId = chain.parentId;
      chain = chains[chainId];

      if (nullable(chain)) {
        break;
      }
    } else {
      const identityChainId = chain.additional?.identityChain;

      if (nullable(identityChainId)) {
        break;
      }

      identityChain = chains[identityChainId] ?? null;
      break;
    }
  }

  return identityChain;
};

export const identityService = {
  findIdentityChain,
};
