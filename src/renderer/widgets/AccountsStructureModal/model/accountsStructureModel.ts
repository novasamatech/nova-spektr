import { combine, createEvent, restore, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { networkModel, networkUtils } from '@/entities/network';

const selectChain = createEvent<ChainId>();
const resetChain = createEvent();

const $selectedChainId = restore(selectChain, null);

const $availableChains = networkModel.$chains.map((chains) => {
  return Object.values(chains).filter((chain) => networkUtils.isGovernanceSupported(chain.options));
});

// Select first chain by default when available chains change
sample({
  clock: $availableChains,
  filter: (chains) => chains.length > 0,
  fn: (chains) => chains[0].chainId,
  target: selectChain,
});

const $selectedChain = combine(
  {
    chainId: $selectedChainId,
    chains: $availableChains,
  },
  ({ chainId, chains }) => {
    return chains.find((chain) => chain.chainId === chainId) ?? null;
  },
);

const $network = combine(
  {
    chain: $selectedChain,
    apis: networkModel.$apis,
  },
  ({ chain, apis }) => {
    if (!chain) return null;

    const api = apis[chain.chainId];
    if (!api) return null;

    const asset = chain.assets.at(0);
    if (!asset) return null;

    return { api, chain, asset };
  },
);

export const accountsStructureModel = {
  $selectedChainId,
  $selectedChain,
  $availableChains,
  $network,

  events: {
    selectChain,
    resetChain,
  },
}; 