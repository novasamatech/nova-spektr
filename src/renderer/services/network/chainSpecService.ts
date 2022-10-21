import { WellKnownChain } from '@polkadot/rpc-provider/substrate-connect';

import { ChainId } from '@renderer/domain/shared-kernel';
import { Chains } from './common/constants';
import { IChainSpecService } from './common/types';

const KnownChains: Record<ChainId, WellKnownChain> = {
  [Chains.POLKADOT]: WellKnownChain.polkadot,
  [Chains.KUSAMA]: WellKnownChain.ksmcc3,
};

export const useChainSpec = (): IChainSpecService => ({
  getLightClientChains: (): ChainId[] => Object.keys(KnownChains) as ChainId[],

  getKnownChain: (chainId: ChainId): WellKnownChain | undefined => KnownChains[chainId],
});
