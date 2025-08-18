import { type ApiPromise } from '@polkadot/api';
import { BN_ZERO } from '@polkadot/util';

import {
  type Asset,
  type AssetId,
  type Balance,
  type BalanceMap,
  type Chain,
  type ChainId,
  CryptoType,
} from '@/shared/core';
import { createAnyOf, createPipeline, createTransformer } from '@/shared/di';
import { assert, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type TransactionValidationBalanceError,
  type TransactionValidationFatalError,
  type TransactionValidationPermissionError,
} from '@/shared/ui-entities';
import { balanceUtils } from '@/entities/balance';
import { networkUtils } from '@/entities/network';
import { type AnyTransaction } from '../transaction/types';

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
const validateRouteBalancesTransformer = createTransformer<
  {
    api: ApiPromise;
    account: AnyAccount;
    route: AnyAccount[];
    chainId: ChainId;
    asset: Asset;
    getBalance(accountId: AccountId, chainId: ChainId, assetId: AssetId): Balance | null;
  },
  Promise<TransactionValidationBalanceError> | TransactionValidationBalanceError
>();
const validateCallPermissionTransformer = createTransformer<
  {
    api: ApiPromise;
    route: AnyAccount[];
    transaction: AnyTransaction;
  },
  TransactionValidationPermissionError
>();

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

    const node: AccountNode = {
      account,
      children: [],
    };
    nodes.set(account, node);

    const children = accountCollectChildrenPipeline([], { account, accounts: chainAccounts });
    node.children = children.map(createNode);

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
  const visited = new Set<AnyAccount>();
  const visitNode = (node: AccountNode) => {
    if (visited.has(node.account)) return;

    if (visitor.enter(node) === false) return false;

    visited.add(node.account);

    for (const child of node.children) {
      if (visitNode(child) === false) return false;
    }

    visitor.exit?.(node);
  };

  visitNode(node);
}

function findLeafs(account: AnyAccount, accounts: AnyAccount[], chain: Chain): AnyAccount[] {
  const graphs = createAccountGraphs(accounts, chain);
  const node = graphs.get(account);
  if (nullable(node)) {
    return [];
  }

  const result: AnyAccount[] = [];

  traverseGraph(node, {
    enter(node) {
      if (node.children.length === 0) {
        result.push(node.account);
      }
    },
  });

  return result;
}

/**
 * Find leaf accounts, that can sign transactions.
 */
function findSignatories(account: AnyAccount, accounts: AnyAccount[], chain: Chain): AnyAccount[] {
  return findLeafs(account, accounts, chain).filter(hasPermissionToMakeActions);
}

/**
 * Find graphs roots.
 */
function findInitiators(accounts: AnyAccount[], chain: Chain): AnyAccount[] {
  const filteredAccounts = accounts.filter(account => isAccountAvailableOnChain(account, chain));
  if (filteredAccounts.length === 0) {
    return [];
  }

  const graphs = createAccountGraphs(accounts, chain);
  const result = new Set<AnyAccount>(filteredAccounts);

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

  const graphs = createAccountGraphs(accounts, chain);
  const entryNode = graphs.get(source);

  if (nullable(entryNode)) {
    return [];
  }

  const queue = [{ node: entryNode, path: [entryNode.account] }];
  const visited = {
    [entryNode.account.id]: true, // because includes in array works for 0(N)
  };
  let i = 0; // because unshift works for 0(N)

  while (queue.length > 0) {
    const item = queue[i];

    if (!item) {
      return [];
    }

    const { node, path } = item;

    for (const child of node.children) {
      if (visited[child.account.id]) continue;

      const newPath = [...path, child.account];

      if (child.account === destination) {
        return newPath;
      }

      visited[child.account.id] = true;
      queue.push({ node: child, path: newPath });
    }

    i++;
  }

  return [];
}

function findInitiator(route: AnyAccount[]): AnyAccount | null {
  return route.at(0) ?? null;
}

function findSignatory(route: AnyAccount[]): AnyAccount | null {
  const account = route.at(-1);
  if (nullable(account)) return null;

  return hasPermissionToMakeActions(account) ? account : null;
}

function findNextAccount(route: AnyAccount[], account: AnyAccount): AnyAccount | null {
  const index = route.indexOf(account);
  if (index === -1) return null;

  return route.at(index + 1) ?? null;
}

// validations

type BalanceValidationParams = {
  route: AnyAccount[];
  balances: BalanceMap;
  asset: Asset;
  api: ApiPromise;
};

async function validateRouteBalances({ api, route, balances, asset }: BalanceValidationParams) {
  const chainId = api.genesisHash.toHex();
  const balancesMap: BalanceMap = {};
  const unhandledAccounts = new Set<AnyAccount>(route);

  for (const account of route) {
    const id = balanceUtils.constructBalanceId(account.accountId, chainId, asset.assetId);
    const balance = balanceUtils.getBalanceById(balances, id);
    if (nullable(balance)) {
      throw new Error(`Balance for ${account.accountId} not found`);
    }

    balancesMap[id] = balance;
  }

  const getBalance = (accountId: AccountId, chainId: ChainId, assetId: AssetId) => {
    const id = balanceUtils.constructBalanceId(accountId, chainId, assetId);
    return balancesMap[id] ?? balanceUtils.getBalanceById(balances, id);
  };

  const results: TransactionValidationBalanceError[] = [];

  for (const account of route) {
    const result = await validateRouteBalancesTransformer({ account, route, getBalance, chainId, asset, api });
    if (result) {
      results.push(result);
      const balanceId = balanceUtils.constructBalanceId(
        result.account.accountId,
        result.balance.balance.chainId,
        result.balance.balance.assetId,
      );
      balancesMap[balanceId] = result.balance.balance;
      unhandledAccounts.delete(result.account);
    }
  }

  for (const account of unhandledAccounts) {
    const balanceId = balanceUtils.constructBalanceId(account.accountId, chainId, asset.assetId);
    const balance = balancesMap[balanceId];
    assert(balance, `Balance for account ${account.accountId} not found`);

    results.push({
      account,
      asset,
      action: '',
      balance: {
        success: true,
        balance,
        required: BN_ZERO,
      },
    });
  }

  return results;
}

type PermissionValidationParams = {
  route: AnyAccount[];
  transaction: AnyTransaction;
  api: ApiPromise;
};

function validateCallPermission({ route, transaction, api }: PermissionValidationParams) {
  const result = validateCallPermissionTransformer({ route, transaction, api });

  if (result) {
    return [result];
  }

  return [];
}

function hasTransactionValidationErrors(
  errors: (
    | TransactionValidationPermissionError
    | TransactionValidationBalanceError
    | TransactionValidationFatalError
  )[],
) {
  return errors.length > 0 && errors.every(e => 'permission' in e || ('balance' in e && e.balance.success === false));
}

export const accountService = {
  accountAvailabilityOnChainAnyOf,
  accountActionPermissionAnyOf,
  accountCanSignMultipleAnyOf,
  accountCollectChildrenPipeline,
  validateRouteBalancesTransformer,
  validateCallPermissionTransformer,

  uniqId,

  isChainAccount,
  isUniversalAccount,
  isAccountAvailableOnChain,
  isCryptoMatch,

  canSignMultipleTransactions,

  hasPermissionToMakeActions,

  filterAccountsOnChain,
  filterAccountsByWallet,

  // graph

  createAccountGraphs,
  findLeafs,
  findSignatories,
  findInitiators,
  findRoute,
  findInitiator,
  findSignatory,
  findNextAccount,
  traverseGraph,

  // validations

  validateRouteBalances,
  validateCallPermission,

  hasTransactionValidationErrors,
};
