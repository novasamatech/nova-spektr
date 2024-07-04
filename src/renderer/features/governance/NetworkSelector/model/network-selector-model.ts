import { createEvent, restore, combine, sample } from 'effector';

import { Chain } from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';

const chainChanged = createEvent<Chain>();
const defaultChainSet = createEvent();

const $governanceChain = restore(chainChanged, null);

const $governanceChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter((chain) => networkUtils.isGovernanceSupported(chain.options));
});

const $governanceChainApi = combine(
  {
    chain: $governanceChain,
    apis: networkModel.$apis,
  },
  ({ chain, apis }) => {
    return chain ? apis[chain.chainId] : null;
  },
);

const $isApiConnected = $governanceChainApi.map((x) => x?.isConnected ?? false);

sample({
  clock: defaultChainSet,
  source: {
    chain: $governanceChain,
    chains: $governanceChains,
  },
  filter: ({ chain, chains }) => !chain && chains.length > 0,
  fn: ({ chains }) => chains.at(0) ?? null,
  target: $governanceChain,
});

export const networkSelectorModel = {
  $governanceChain,
  $governanceChains,
  $governanceChainApi,
  $isApiConnected,
  input: {
    defaultChainSet,
  },
  events: {
    chainChanged,
  },
};
