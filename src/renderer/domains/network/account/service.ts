import { type Chain, CryptoType } from '@/shared/core';
import { createAnyOf, createPipeline } from '@/shared/di';
import { nullable } from '@/shared/lib/utils';
import { networkUtils } from '@/entities/network';

import {
  type AccountNode,
  type AnyAccount,
  type AnyAccountDraft,
  type ChainAccount,
  type UniversalAccount,
} from './types';

const accountAvailabilityOnChainAnyOf = createAnyOf<{ account: UniversalAccount; chain: Chain }>();
const accountActionPermissionAnyOf = createAnyOf<{ account: AnyAccount }>();
const accountCanSignMultipleAnyOf = createAnyOf<{ account: AnyAccount }>();
const accountCollectChildrenPipeline = createPipeline<AnyAccount[], { account: AnyAccount; accounts: AnyAccount[] }>();

/**
 * ATTENTION! This method is the source of stable id for different types of
 * account. If you want to change implementation you should also write db
 * migrations and make regress testing across application to verify that new
 * account id has no collisions.
 */
function uniqId(account: AnyAccountDraft) {
  if (isUniversalAccount(account)) {
    return `${account.walletId} ${account.accountId} universal`;
  }
  if (isChainAccount(account)) {
    return `${account.walletId} ${account.accountId} ${account.chainId}`;
  }

  throw new Error('Unsupported account type.');
}

function isCryptoMatch(account: Pick<AnyAccount, 'cryptoType'>, chain: Chain): boolean {
  if (!chain) {
    return false;
  }

  const supportedCryptoTypes = networkUtils.isEthereumBased(chain.options)
    ? [CryptoType.ECDSA, CryptoType.ETHEREUM]
    : [CryptoType.SR25519, CryptoType.ED25519];

  return supportedCryptoTypes.includes(account.cryptoType);
}

function isChainAccount(account: Pick<AnyAccount, 'type'>): account is ChainAccount {
  return account.type === 'chain';
}

function isUniversalAccount(account: Pick<AnyAccount, 'type'>): account is UniversalAccount {
  return account.type === 'universal';
}

function isAccountAvailableOnChain(account: Pick<AnyAccount, 'type' | 'cryptoType'>, chain: Chain) {
  if (!chain) {
    return false;
  }

  if (!isCryptoMatch(account, chain)) {
    return false;
  }

  if (isChainAccount(account)) {
    return account.chainId === chain.chainId;
  }

  if (isUniversalAccount(account)) {
    return accountAvailabilityOnChainAnyOf.check({ account, chain });
  }

  return false;
}

function filterAccountsOnChain(accounts: AnyAccount[], chain: Chain) {
  return accounts.filter(account => isAccountAvailableOnChain(account, chain));
}

function filterAccountsByWallet(accounts: AnyAccount[], walletId: number) {
  return accounts.filter(account => account.walletId === walletId);
}

function hasPermissionToMakeActions(account: AnyAccount) {
  return accountActionPermissionAnyOf.check({ account });
}

function canSignMultipleTransactions(account: AnyAccount) {
  return accountCanSignMultipleAnyOf.check({ account });
}

/**
 * Create accounts graph for given chain. Returns map, where key is account and
 * value is graph node.
 */
function createAccountGraphs(accounts: AnyAccount[], chain: Chain): Map<AnyAccount, AccountNode> {
  const chainAccounts = accounts.filter(account => isAccountAvailableOnChain(account, chain));
  const nodes = new Map<AnyAccount, AccountNode>();

  const createNode = (account: AnyAccount): AccountNode => {
    const existingNode = nodes.get(account);
    if (existingNode) return existingNode;

    const children = accountCollectChildrenPipeline([], { account, accounts: chainAccounts });
    const node: AccountNode = {
      account,
      children: children.map(createNode),
    };

    nodes.set(account, node);

    return node;
  };

  for (const account of chainAccounts) {
    createNode(account);
  }

  return nodes;
}

/**
 * Deep first search. Return false from enter visitor to stop traversing.
 */
function traverseGraph(
  node: AccountNode,
  visitor: {
    enter: (node: AccountNode) => false | void;
    exit?: (node: AccountNode) => void;
  },
) {
  const visitNode = (node: AccountNode) => {
    if (visitor.enter(node) === false) return false;

    for (const child of node.children) {
      if (visitNode(child) === false) return false;
    }

    visitor.exit?.(node);
  };

  visitNode(node);
}

/**
 * Find leaf accounts, that can sign transactions.
 */
function findSignatories(account: AnyAccount, accounts: AnyAccount[], chain: Chain): AnyAccount[] {
  const graphs = createAccountGraphs(accounts, chain);
  const node = graphs.get(account);
  if (nullable(node)) {
    return [];
  }

  const result: AnyAccount[] = [];

  traverseGraph(node, {
    enter(node) {
      if (node.children.length === 0 && hasPermissionToMakeActions(node.account)) {
        result.push(node.account);
      }
    },
  });

  return result;
}

/**
 * Find graphs roots.
 */
function findInitiators(accounts: AnyAccount[], chain: Chain): AnyAccount[] {
  const graphs = createAccountGraphs(accounts, chain);
  const result = new Set<AnyAccount>(accounts);

  for (const node of graphs.values()) {
    traverseGraph(node, {
      enter(node) {
        for (const child of node.children) {
          result.delete(child.account);
        }
      },
    });
  }

  return Array.from(result);
}

/**
 * Search for route from source account to destination. If there is no
 * connection between accounts - returns empty array.
 */
function findRoute(source: AnyAccount, destination: AnyAccount, accounts: AnyAccount[], chain: Chain): AnyAccount[] {
  if (source === destination) {
    return [destination];
  }

  const stack: AnyAccount[] = [];
  const graphs = createAccountGraphs(accounts, chain);
  const entryNode = graphs.get(source);

  if (nullable(entryNode)) {
    return [];
  }

  traverseGraph(entryNode, {
    enter(node) {
      stack.push(node.account);
      if (node.account === destination) {
        return false;
      }
    },
    exit() {
      stack.pop();
    },
  });

  return stack;
}

export const accountService = {
  accountAvailabilityOnChainAnyOf,
  accountActionPermissionAnyOf,
  accountCanSignMultipleAnyOf,
  accountCollectChildrenPipeline,

  uniqId,

  isChainAccount,
  isUniversalAccount,
  isAccountAvailableOnChain,

  canSignMultipleTransactions,

  hasPermissionToMakeActions,

  filterAccountsOnChain,
  filterAccountsByWallet,

  // graph

  createAccountGraphs,
  findSignatories,
  findInitiators,
  findRoute,
  traverseGraph,
};
