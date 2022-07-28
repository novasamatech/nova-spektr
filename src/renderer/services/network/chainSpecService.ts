import { WellKnownChain } from '@polkadot/rpc-provider/substrate-connect';

import { HexString } from '@renderer/domain/types';
import { Chains, TestChains } from './common/constants';
import { IChainSpecService } from './common/types';
import westmint from './common/chainSpecs/westend-westmint.json';
import statemine from './common/chainSpecs/kusama-statemine.json';
import karura from './common/chainSpecs/kusama-karura.json';
import acala from './common/chainSpecs/polkadot-acala.json';
import statemint from './common/chainSpecs/polkadot-statemint.json';

const ChainSpecs: Record<HexString, string> = {
  [Chains.STATEMINE]: JSON.stringify(statemine),
  [Chains.STATEMINT]: JSON.stringify(statemint),
  [Chains.KARURA]: JSON.stringify(karura),
  [Chains.ACALA]: JSON.stringify(acala),
  [TestChains.WESTMINT]: JSON.stringify(westmint),
};

const KnownChains: Record<HexString, WellKnownChain> = {
  [Chains.POLKADOT]: WellKnownChain.polkadot,
  [Chains.KUSAMA]: WellKnownChain.ksmcc3,
  [TestChains.WESTEND]: WellKnownChain.westend2,
};

export function useChainSpec(): IChainSpecService {
  return {
    getChainSpec: (chainId: HexString): Promise<string | undefined> => {
      return Promise.resolve(ChainSpecs[chainId]);
    },
    getKnownChain: (chainId: HexString): WellKnownChain | undefined => KnownChains[chainId],
  };
}
