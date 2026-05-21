import { combine, createEvent, restore, sample } from 'effector';

import { type Chain, ChainOptions } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountNode, type AnyAccount, accountService, identity } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';

const $allChains = networkModel.$chains.map((chains) => {
  const requiredOptions = new Set([ChainOptions.MULTISIG, ChainOptions.PURE_PROXY, ChainOptions.REGULAR_PROXY]);
  return Object.values(chains).filter((chain) => chain.options?.some((option) => requiredOptions.has(option)));
});
const $allChainsMap = $allChains.map((chains) => new Map(chains.map((chain) => [chain.chainId, chain])));

const selectChain = createEvent<Chain | null>();
const setAccounts = createEvent<AnyAccount[] | null>();
const selectAccount = createEvent<AnyAccount>();

const $selectedChain = restore(selectChain, null);

const $allAccounts = restore(setAccounts, null);

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
      accountsForSelectedChain?.find((item) => item.id === selectedAccount?.id) ?? accountsForSelectedChain?.[0] ?? null
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
  fn: (filteredChains) => {
    const firstChain = Array.from(filteredChains.values())[0];
    return firstChain ?? null;
  },
  target: selectChain,
});

const focusOnSelected = createEvent();
const reset = createEvent();

const setPathType = createEvent<'straight' | 'bezier' | 'smoothStep'>();
const setEdgeType = createEvent<'solid' | 'dashed'>();

const $pathType = restore(setPathType, 'bezier').reset(reset);
const $edgeType = restore(setEdgeType, 'dashed').reset(reset);

const setViewport = createEvent<{ x: number; y: number; zoom: number }>();
const $viewport = restore(setViewport, { x: 0, y: 0, zoom: 1 });

const setCanvasSize = createEvent<{ width: number; height: number }>();
const $canvasSize = restore(setCanvasSize, { width: 0, height: 0 });

const enterAccountNode = createEvent<AccountNode>();
const leaveAccountNode = createEvent();
const holdAccountNode = createEvent<AccountNode>();
const releaseAccountNode = createEvent();

const $hoveredAccountNode = restore(enterAccountNode, null).reset(leaveAccountNode, releaseAccountNode);
const $heldAccountNode = restore(holdAccountNode, null).reset(releaseAccountNode);

const setExclusive = createEvent<boolean>();
const $exclusive = restore(setExclusive, false);

// Exclusive mode skips merging with wallet-store accounts.
const $mergedAccounts = combine(
  { walletAccounts: walletModel.$availableAccounts, passedAccounts: $allAccounts, exclusive: $exclusive },
  ({ walletAccounts, passedAccounts, exclusive }) => {
    if (exclusive) return passedAccounts ?? [];
    if (!passedAccounts?.length) return walletAccounts;

    const merged = [...(walletAccounts ?? [])];
    const existingIds = new Set(merged.map((a) => a.id));
    for (const account of passedAccounts) {
      if (!existingIds.has(account.id)) {
        merged.push(account);
      }
    }

    return merged;
  },
);

const $highlightedNodes = combine(
  {
    selectedAccount: $selectedAccount,
    accountList: $mergedAccounts,
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
        if (child.account.id === account.id) {
          result.set(node.account, node);
          return false;
        }
      },
    });
  }

  return result;
}

const $graph = combine(
  {
    accounts: $mergedAccounts,
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
  $selectedChain,
  $selectedAccount,
  $availableAccounts,
  $availableChains,
  $allChainsMap,

  selectChain,
  setAccounts,
  setExclusive,
  selectAccount,
  setPathType,
  setEdgeType,
  $pathType,
  $edgeType,

  focusOnSelected,
  reset,
  setViewport,
  $viewport,
  setCanvasSize,
  $canvasSize,
  enterAccountNode,
  leaveAccountNode,
  holdAccountNode,
  releaseAccountNode,
  $highlightedNodesIds,
  $heldAccountNode,

  $graph,
};
