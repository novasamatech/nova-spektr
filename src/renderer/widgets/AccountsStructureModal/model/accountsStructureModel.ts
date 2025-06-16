import { combine, createEvent, createStore, sample } from 'effector';

import { accountService } from '@/domains/network';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';

const $availableChains = networkModel.$chains.map((chains) => Object.values(chains));

const selectChain = createEvent<string>();
const resetChain = createEvent();
const setAccounts = createEvent<AnyAccount[] | null>();
const selectAccount = createEvent<AnyAccount>();

const $selectedChainId = createStore<string | null>(null)
  .on(selectChain, (_, chainId) => chainId)
  .reset(resetChain);

const $accountList = createStore<AnyAccount[] | null>(null)
  .on(setAccounts, (_, accounts) => accounts)
  .reset(resetChain);

const $selectedAccount = createStore<AnyAccount | null>(null)
  .on(setAccounts, (_, accounts) => accounts?.[0] ?? null)
  .on(selectAccount, (_, account) => account);

// Filter available chains based on account
const $filteredChains = combine(
  {
    chains: $availableChains,
    account: $selectedAccount,
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
  $selectedAccount,
  $accountList,
  $availableChains: $filteredChains,
  $filteredChains,
  $network,

  events: {
    selectChain,
    resetChain,
    setAccounts,
    selectAccount,
  },
};
