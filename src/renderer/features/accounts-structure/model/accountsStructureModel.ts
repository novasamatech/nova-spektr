import { combine, createEvent, restore, sample } from 'effector';

import { type Chain } from '@/shared/core';
import { type AccountNode, type AnyAccount, accountService, identity } from '@/domains/network';
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

export const setPathType = createEvent<'straight' | 'bezier' | 'smoothStep'>();
export const setEdgeType = createEvent<'solid' | 'dashed'>();

export const $pathType = restore(setPathType, 'bezier');
export const $edgeType = restore(setEdgeType, 'dashed');

export const focusOnSelected = createEvent();

function findNodesRelatedToAccount(
  accounts: AnyAccount[] | null,
  account: AnyAccount | null,
  chain: Chain,
): Map<AnyAccount, AccountNode> | null {
  if (!accounts || !account || !chain) return null;
  const graph = accountService.createAccountGraphs(accounts, chain);
  const result: Map<AnyAccount, AccountNode> = new Map();

  for (const node of graph.values()) {
    accountService.traverseGraph(node, {
      enter(child) {
        if (child.account === account) {
          result.set(node.account, node);
          return false;
        }
      },
    });
  }

  return result;
}

export const $graph = combine(
  {
    accounts: $accountList,
    selectedAccount: $selectedAccount,
    selectedChain: $selectedChain,
  },
  ({ accounts, selectedAccount, selectedChain }) => {
    if (!selectedChain || !selectedAccount) return null;
    return findNodesRelatedToAccount(accounts, selectedAccount, selectedChain);
  },
);

sample({
  clock: combine({
    chain: $selectedChain,
    graph: $graph,
  }),
  filter: ({ chain, graph }) => !!chain && !!graph && graph.size > 0,
  fn: ({ chain, graph }) => ({
    chainId: chain!.chainId,
    accounts: Array.from(graph!.keys()).map((acc) => acc.accountId),
  }),
  target: identity.request,
});

export const accountsStructureModel = {
  $selectedChainId,
  $selectedAccount,
  $accountList,
  $availableChains: $availableChains,
  $filteredChains: $availableChains,
  $network,

  selectChain,
  setAccounts,
  selectAccount,
  setPathType,
  setEdgeType,
  $pathType,
  $edgeType,

  focusOnSelected,

  $graph,
};
