import { combine, createEvent, restore, sample } from 'effector';

import { accountService } from '@/domains/network';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';

const $allChains = networkModel.$chains.map((chains) => Object.values(chains));

const selectChain = createEvent<string>();
const setAccounts = createEvent<AnyAccount[] | null>();
const selectAccount = createEvent<AnyAccount>();

const $selectedChainId = restore(selectChain, null);

const $accountList = restore(setAccounts, null);
const $selectedAccount = restore(selectAccount, null).on(setAccounts, (_, accounts) => accounts?.[0] ?? null);

const $availableChains = combine(
  {
    chains: $allChains,
    account: $selectedAccount,
  },
  ({ chains, account }) => {
    if (!account) return chains;
    return chains.filter((chain) => accountService.isAccountAvailableOnChain(account, chain));
  },
);

// Set initial chain to first available one when account changes
sample({
  clock: $availableChains,
  source: $selectedChainId,
  fn: (_, filteredChains) => filteredChains[0]?.chainId ?? null,
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
  $selectedAccount,
  $accountList,
  $availableChains: $availableChains,
  $filteredChains: $availableChains,
  $network,

  selectChain,
  setAccounts,
  selectAccount,
};
