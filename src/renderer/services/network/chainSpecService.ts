import { WellKnownChain } from '@polkadot/rpc-provider/substrate-connect';

import { ChainId } from '@renderer/domain/shared-kernel';
import { Chains, TestChains } from './common/constants';
import { IChainSpecService } from './common/types';

const KnownChains: Record<ChainId, WellKnownChain> = {
  [Chains.POLKADOT]: WellKnownChain.polkadot,
  [Chains.KUSAMA]: WellKnownChain.ksmcc3,
  [TestChains.WESTEND]: WellKnownChain.westend2,
  [TestChains.ROCOCO]: WellKnownChain.rococo_v2_2,
};

export const useChainSpec = (): IChainSpecService => ({
  getLightClientChains: (): ChainId[] => Object.keys(KnownChains) as ChainId[],

  getKnownChain: (chainId: ChainId): WellKnownChain | undefined => KnownChains[chainId],
});
