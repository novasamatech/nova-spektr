import { WellKnownChain } from '@polkadot/rpc-provider/substrate-connect';

import { ChainId } from '@renderer/domain/shared-kernel';
import karura from './common/chainSpecs/kusama-karura.json';
import statemine from './common/chainSpecs/kusama-statemine.json';
import acala from './common/chainSpecs/polkadot-acala.json';
import statemint from './common/chainSpecs/polkadot-statemint.json';
import westmint from './common/chainSpecs/westend-westmint.json';
import { Chains, TestChains } from './common/constants';
import { IChainSpecService } from './common/types';

const ChainSpecs: Record<ChainId, string> = {
  [Chains.STATEMINE]: JSON.stringify(statemine),
  [Chains.STATEMINT]: JSON.stringify(statemint),
  [Chains.KARURA]: JSON.stringify(karura),
  [Chains.ACALA]: JSON.stringify(acala),
  [TestChains.WESTMINT]: JSON.stringify(westmint),
};

const KnownChains: Record<ChainId, WellKnownChain> = {
  [Chains.POLKADOT]: WellKnownChain.polkadot,
  [Chains.KUSAMA]: WellKnownChain.ksmcc3,
  [TestChains.WESTEND]: WellKnownChain.westend2,
};

export const useChainSpec = (): IChainSpecService => ({
  getChainSpec: (chainId: ChainId): Promise<string | undefined> => Promise.resolve(ChainSpecs[chainId]),

  getLightClientChains: (): ChainId[] => Object.keys({ ...ChainSpecs, ...KnownChains }) as ChainId[],

  getKnownChain: (chainId: ChainId): WellKnownChain | undefined => KnownChains[chainId],
});
