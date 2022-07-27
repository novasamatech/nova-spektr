import { WellKnownChain } from '@polkadot/rpc-provider/substrate-connect';

import { IChainSpecService } from './types';
import westmint from './chainSpecs/westend-westmint.json';
import statemine from './chainSpecs/kusama-statemine.json';
import karura from './chainSpecs/kusama-karura.json';
import acala from './chainSpecs/polkadot-acala.json';
import statemint from './chainSpecs/polkadot-statemint.json';
import { HexString } from '@renderer/domain/types';

const ChainSpecs: Record<HexString, string> = {
  '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a': JSON.stringify(statemine),
  '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9': JSON.stringify(westmint),
  '0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b': JSON.stringify(karura),
  '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c': JSON.stringify(acala),
  '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f': JSON.stringify(statemint),
};

const KnownChains: Record<HexString, WellKnownChain> = {
  '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': WellKnownChain.polkadot,
  '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe': WellKnownChain.ksmcc3,
  '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e': WellKnownChain.westend2,
};

export function useChainSpec(): IChainSpecService {
  return {
    getChainSpec: (chainId: HexString): Promise<string> => {
      return Promise.resolve(ChainSpecs[chainId] || '');
    },
    getKnownChain: (chainId: HexString): WellKnownChain | undefined => KnownChains[chainId],
  };
}
