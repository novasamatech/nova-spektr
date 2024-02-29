import { WellKnownChain } from '@substrate/connect';

import { Chains } from './common/constants';
import type { ChainId } from '@shared/core';

const KnownChains: Record<ChainId, WellKnownChain> = {
  [Chains.POLKADOT]: WellKnownChain.polkadot,
  [Chains.KUSAMA]: WellKnownChain.ksmcc3,
};

export const chainSpecService = {
  getLightClientChains,
  getKnownChain,
};

function getLightClientChains(): ChainId[] {
  return Object.keys(KnownChains) as ChainId[];
}

function getKnownChain(chainId: ChainId): WellKnownChain | undefined {
  return KnownChains[chainId];
}
