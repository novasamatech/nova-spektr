import { combine, createEvent, restore, sample } from 'effector';

import { type Chain, type ChainId, ChainOptions } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountNode, type AnyAccount, accountService, accounts, identity } from '@/domains/network';
import { networkModel } from '@/entities/network';

const $allChains = networkModel.$chains.map((chains) => {
  const requiredOptions = new Set([ChainOptions.MULTISIG, ChainOptions.PURE_PROXY, ChainOptions.REGULAR_PROXY]);
  return Object.values(chains).filter((chain) => chain.options?.some((option) => requiredOptions.has(option)));
});
const $allChainsMap = $allChains.map((chains) => new Map(chains.map((chain) => [chain.chainId, chain])));

const selectChain = createEvent<ChainId>();
const setAccounts = createEvent<AnyAccount[] | null>();
const selectAccount = createEvent<AnyAccount>();

const $selectedChainId = restore(selectChain, null);

const $allAccounts = restore(setAccounts, null);

const $selectedChain = combine(
  {
    chainId: $selectedChainId,
    chains: $allChainsMap,
  },
  ({ chainId, chains }) => (chainId ? (chains.get(chainId) ?? null) : null),
);

const $availableAccounts = combine(
  {
    allAccounts: $allAccounts,
    selectedChain: $selectedChain,
  },
  ({ allAccounts, selectedChain }) => {
    if (!allAccounts || !selectedChain) return null;

    return allAccounts.filter((account) => accountService.isAccountAvailableOnChain(account, selectedChain));
  },
);

const $selectedAccount = restore(selectAccount, null).on(
  $availableAccounts,
  (selectedAccount, accountsForSelectedChain) => {
    return (
      accountsForSelectedChain?.find((item) => item.accountId === selectedAccount?.accountId) ??
      accountsForSelectedChain?.[0] ??
      null
    );
  },
);

const $availableChains = combine(
  {
    chains: $allChains,
    accounts: $allAccounts,
  },
  ({ chains, accounts }) => {
    if (!accounts) return chains;

    return chains.filter((chain) =>
      accounts.some((account) => accountService.isAccountAvailableOnChain(account, chain)),
    );
  },
);

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

export const focusOnSelected = createEvent();
export const reset = createEvent();

export const setPathType = createEvent<'straight' | 'bezier' | 'smoothStep'>();
export const setEdgeType = createEvent<'solid' | 'dashed'>();

export const $pathType = restore(setPathType, 'bezier').reset(reset);
export const $edgeType = restore(setEdgeType, 'dashed').reset(reset);

export const setViewport = createEvent<{ x: number; y: number; zoom: number }>();
export const $viewport = restore(setViewport, { x: 0, y: 0, zoom: 1 });

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
    hoveredAccountNode: $hoveredAccountNode,
    heldAccountNode: $heldAccountNode,
  },
  ({ selectedAccount, accountList, selectedChain, hoveredAccountNode, heldAccountNode }) => {
    const focusedAccountNode = heldAccountNode ?? hoveredAccountNode;

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

  return new Set(accounts.map((account) => account.accountId));
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
  filter: ({ chain, graph }) => nonNullable(chain) && nonNullable(graph),
  fn: ({ chain, graph }) => ({
    chainId: chain!.chainId,
    accounts: Array.from(graph!.values()).flatMap(({ account, children }) => [
      account.accountId,
      ...children.map((child) => child.account.accountId),
    ]),
  }),
  target: identity.request,
});

export const accountsStructureModel = {
  $selectedChainId,
  $selectedChain,
  $selectedAccount,
  $availableAccounts,
  $availableChains,
  $allChainsMap,

  selectChain,
  setAccounts,
  selectAccount,
  setPathType,
  setEdgeType,
  $pathType,
  $edgeType,

  focusOnSelected,
  reset,
  setViewport,
  $viewport,
  enterAccountNode,
  leaveAccountNode,
  holdAccountNode,
  releaseAccountNode,
  $highlightedNodesIds,
  $heldAccountNode,

  $graph,
};
