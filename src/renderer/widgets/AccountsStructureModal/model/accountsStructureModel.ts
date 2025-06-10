import { combine, createEvent, createStore, sample } from 'effector';

import { accountService } from '@/domains/network';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';

const $availableChains = networkModel.$chains.map((chains) => Object.values(chains));

const selectChain = createEvent<string>();
const resetChain = createEvent();
const setAccount = createEvent<AnyAccount | null>();

const $selectedChainId = createStore<string | null>(null)
  .on(selectChain, (_, chainId) => chainId)
  .reset(resetChain);

const $account = createStore<AnyAccount | null>(null)
  .on(setAccount, (_, account) => account)
  .reset(resetChain);

// Filter available chains based on account
const $filteredChains = combine(
  {
    chains: $availableChains,
    account: $account,
  },
  ({ chains, account }) => {
    if (!account) return chains;
    return chains.filter((chain) => accountService.isAccountAvailableOnChain(account, chain));
  },
);

// Set initial chain to first available one when account changes
sample({
  clock: $filteredChains,
  source: $selectedChainId,
  filter: (selectedChainId, filteredChains) => {
    if (!selectedChainId || !filteredChains.length) return true;
    return !filteredChains.some((chain) => chain.chainId === selectedChainId);
  },
  fn: (_, filteredChains) => filteredChains[0]?.chainId ?? null,
  target: selectChain,
});

const $selectedChain = combine(
  {
    chainId: $selectedChainId,
    chains: $filteredChains,
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
  $availableChains: $filteredChains,
  $filteredChains,
  $network,

  events: {
    selectChain,
    resetChain,
    setAccount,
  },
};
