import { combine, createEvent, restore, sample } from 'effector';

import { type Chain, type ChainId, ChainOptions } from '@/shared/core';
import { type AccountNode, type AnyAccount, accountService, accounts, identity } from '@/domains/network';
import { networkModel } from '@/entities/network';

const $allChains = networkModel.$chains.map((chains) => {
  const requiredOptions = new Set([ChainOptions.MULTISIG, ChainOptions.PURE_PROXY, ChainOptions.REGULAR_PROXY]);
  return Object.values(chains).filter((chain) => chain.options?.some((option) => requiredOptions.has(option)));
});

const selectChain = createEvent<ChainId>();
const setAccounts = createEvent<AnyAccount[] | null>();
const selectAccount = createEvent<AnyAccount>();

const $selectedChainId = restore(selectChain, null);

const $allAccounts = restore(setAccounts, null);

const $availableAccounts = combine(
  {
    allAccounts: $allAccounts,
    allChains: $allChains,
  },
  ({ allAccounts, allChains }) => {
    if (!allAccounts) return null;
    return allAccounts.filter((account) =>
      allChains.some((chain) => accountService.isAccountAvailableOnChain(account, chain)),
    );
  },
);

const $selectedAccount = combine(
  {
    selected: restore(selectAccount, null),
    availableAccounts: $availableAccounts,
  },
  ({ selected, availableAccounts }) => {
    if (selected) return selected;
    return availableAccounts?.[0] ?? null;
  },
);

const $availableChains = combine(
  {
    chains: $allChains,
    account: $selectedAccount,
  },
  ({ chains, account }) => {
    return !account ? chains : chains.filter((chain) => accountService.isAccountAvailableOnChain(account, chain));
  },
);

const $availableChainsMap = $availableChains.map((chains) => new Map(chains.map((chain) => [chain.chainId, chain])));

// Set initial chain to first available one when account changes
sample({
  clock: $availableChains,
  source: $selectedChainId,
  fn: (_, filteredChains) => {
    const firstChain = Array.from(filteredChains.values())[0];
    return firstChain?.chainId ?? null;
  },
  target: selectChain,
});

const $selectedChain = combine(
  {
    chainId: $selectedChainId,
    chains: $availableChainsMap,
  },
  ({ chainId, chains }) => {
    return chainId ? (chains.get(chainId) ?? null) : null;
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

export const enterAccountNode = createEvent<AccountNode>();
export const leaveAccountNode = createEvent();
export const holdAccountNode = createEvent<AccountNode>();
export const releaseAccountNode = createEvent();

const $hoveredAccountNode = restore(enterAccountNode, null).reset(leaveAccountNode, releaseAccountNode);
const $heldAccountNode = restore(holdAccountNode, null).reset(releaseAccountNode);

export const $highlightedNodes = combine(
  {
    selectedAccount: $selectedAccount,
    accountList: accounts.$list,
    selectedChain: $selectedChain,
    focusedAccountNode: $hoveredAccountNode,
    heldAccountNode: $heldAccountNode,
  },
  ({ selectedAccount, accountList, selectedChain, focusedAccountNode }) => {
    if (!selectedAccount || !focusedAccountNode || !accountList || !selectedChain) return [];

    const pathToSelected = accountService.findRoute(
      selectedAccount,
      focusedAccountNode.account,
      accountList,
      selectedChain,
    );

    const descendants: AnyAccount[] = [];
    accountService.traverseGraph(focusedAccountNode, {
      enter(node) {
        descendants.push(node.account);
      },
    });

    return [...pathToSelected, ...descendants];
  },
);

const $highlightedNodesIds = $highlightedNodes.map((accounts) => {
  if (!accounts.length) return null;

  return new Set(accounts.map((account) => account.id));
});

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
    accounts: accounts.$list,
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
  $selectedChain,
  $selectedAccount,
  $allAccounts,
  $availableChains,
  $availableChainsMap,
  $network,

  selectChain,
  setAccounts,
  selectAccount,
  setPathType,
  setEdgeType,
  $pathType,
  $edgeType,

  focusOnSelected,
  enterAccountNode,
  leaveAccountNode,
  holdAccountNode,
  releaseAccountNode,
  $highlightedNodesIds,
  $heldAccountNode,

  $graph,
};
