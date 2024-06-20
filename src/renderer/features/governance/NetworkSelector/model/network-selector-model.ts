import { createEvent, restore, combine, sample } from 'effector';

import { Chain } from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';

const chainChanged = createEvent<Chain>();
const defaultChainSet = createEvent();

const $governanceChain = restore(chainChanged, null);

const $governanceChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter((chain) => networkUtils.isGovernanceSupported(chain.options));
});

const $isApiConnected = combine(
  {
    chain: $governanceChain,
    apis: networkModel.$apis,
  },
  ({ chain, apis }) => {
    return chain ? Boolean(apis[chain.chainId]?.isConnected) : false;
  },
);

sample({
  clock: defaultChainSet,
  source: {
    chain: $governanceChain,
    chains: $governanceChains,
  },
  filter: ({ chain, chains }) => !chain && chains.length > 0,
  fn: ({ chains }) => chains[0],
  target: $governanceChain,
});

export const networkSelectorModel = {
  $governanceChain,
  $governanceChains,
  $isApiConnected,
  input: {
    defaultChainSet,
  },
  events: {
    chainChanged,
  },
};
