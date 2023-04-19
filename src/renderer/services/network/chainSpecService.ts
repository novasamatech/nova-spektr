import { WellKnownChain } from '@substrate/connect';

import { ChainID } from '@renderer/domain/shared-kernel';
import { Chains } from './common/constants';
import { IChainSpecService } from './common/types';

const KnownChains: Record<ChainID, WellKnownChain> = {
  [Chains.POLKADOT]: WellKnownChain.polkadot,
  [Chains.KUSAMA]: WellKnownChain.ksmcc3,
};

export const useChainSpec = (): IChainSpecService => {
  const getLightClientChains = (): ChainID[] => {
    return Object.keys(KnownChains) as ChainID[];
  };

  const getKnownChain = (chainId: ChainID): WellKnownChain | undefined => {
    return KnownChains[chainId];
  };

  return {
    getLightClientChains,
    getKnownChain,
  };
};
