import { type ApiPromise } from '@polkadot/api';

import {
  AccountNameType,
  type Asset,
  type AssetId,
  type Balance,
  type BalanceMap,
  type Chain,
  type ChainId,
  type Contact,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { createAnyOf, createPipeline, createTransformer } from '@/shared/di';
import { isEthereumAccountId, keys, nullable, toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type TransactionValidationBalanceError,
  type TransactionValidationFatalError,
  type TransactionValidationPermissionError,
} from '@/shared/ui-entities';
import { balanceUtils } from '@/entities/balance';
import { networkUtils } from '@/entities/network';
import { identityService } from '../identity/service';
import { type IdentityMap } from '../identity/types';
import { type AnyTransaction } from '../transaction/types';

import {
  type AccountNode,
  type AnyAccount,
  type AnyAccountDraft,
  type ChainAccount,
  type UniversalAccount,
} from './types';

const accountAvailabilityOnChainAnyOf = createAnyOf<{ account: AnyAccount; chain: Chain }>();
const accountActionPermissionAnyOf = createAnyOf<{ account: AnyAccount }>();
const accountCanSignMultipleAnyOf = createAnyOf<{ account: AnyAccount }>();
const accountCollectChildrenPipeline = createPipeline<
  AnyAccount[],
  { account: AnyAccount; accounts: AnyAccount[]; connectionIndex?: number }
>();

/**
 * Pipeline for getting the number of connection indices for an account.
 * Features can register handlers to return how many nodes should be created for an account.
 * Default is 1 node per account.
 */
const accountConnectionCountTransformer = createTransformer<{ account: AnyAccount }, number>();
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

function isAccountSchemeMatchChain(accountId: AccountId, chain: Chain): boolean {
  return networkUtils.isEthereumBased(chain.options) === isEthereumAccountId(accountId);
}

function isCryptoMatch(account: Pick<AnyAccount, 'accountId'>, chain: Chain): boolean {
  return isAccountSchemeMatchChain(account.accountId, chain);
}

function isChainMatch(account: ChainAccount, chain: Chain) {
  return account.chainId === chain.chainId;
}

function isChainAccount(account: Pick<AnyAccount, 'type'>): account is ChainAccount {
  return account.type === 'chain';
}

function isUniversalAccount(account: Pick<AnyAccount, 'type'>): account is UniversalAccount {
  return account.type === 'universal';
}

function isAccountAvailableOnChain(account: AnyAccount, chain: Chain) {
  if (!chain) {
    return false;
  }

  if (!isCryptoMatch(account, chain)) {
    return false;
  }

  return accountAvailabilityOnChainAnyOf.check({ account, chain });
}

function filterAccountsOnChain(accounts: AnyAccount[], chain: Chain) {
  return accounts.filter(account => isAccountAvailableOnChain(account, chain));
}

function filterAccountsByWallet(accounts: AnyAccount[], walletId: number) {
  return accounts.filter(account => account.walletId === walletId);
}

type ResolveWalletNameParams = {
  wallet: Wallet;
  accounts: AnyAccount[];
  contacts: Contact[];
  identities: IdentityMap;
  chains: Record<string, Chain>;
};

type ResolveAccountNameParams = {
  accountId: AccountId;
  accounts: AnyAccount[];
  contacts: Contact[];
  identities: IdentityMap;
  chains: Record<string, Chain>;
  chain?: Chain | null;
  title?: string;
};

function getAccountById(accounts: AnyAccount[], accountId: AccountId | null): AnyAccount | undefined {
  if (nullable(accountId)) {
    return undefined;
  }

  return accounts.find(account => account.accountId === accountId);
}

function getAccountIdentity(accountId: AccountId, identities: IdentityMap) {
  for (const chainId of keys(identities)) {
    const identity = identities[chainId]?.[accountId];
    if (identity) {
      return identity;
    }
  }

  return null;
}

function isCustomAccountName(account: AnyAccount) {
  if (!account?.name) {
    return false;
  }

  return account.nameType === AccountNameType.CUSTOM;
}

function getRelatedChainId(account?: AnyAccount): ChainId | null {
  if (!account) return null;

  if (accountService.isChainAccount(account)) {
    return account.chainId;
  }

  if ('remarkChainId' in account && account.remarkChainId) {
    return account.remarkChainId as ChainId;
  }

  return null;
}

function getAccountAddressPrefix(
  chain: Chain | null | undefined,
  relatedAccount: AnyAccount | undefined,
  chains: Record<string, Chain>,
): number | undefined {
  if (chain?.addressPrefix !== undefined) {
    return chain.addressPrefix;
  }

  if (!relatedAccount) {
    return undefined;
  }

  const relatedChainId = getRelatedChainId(relatedAccount);
  if (!relatedChainId) {
    return undefined;
  }

  return chains[relatedChainId]?.addressPrefix;
}

function getWalletAccountId(wallet: Wallet, accounts: AnyAccount[]): AccountId | null {
  if (wallet.type === WalletType.POLKADOT_VAULT || wallet.type === WalletType.SINGLE_PARITY_SIGNER) {
    return 'rootAccountId' in wallet ? (wallet.rootAccountId as AccountId) : null;
  }

  const walletAccounts = filterAccountsByWallet(accounts, wallet.id);

  const universalAccount = walletAccounts.find(acc => isUniversalAccount(acc));

  return universalAccount?.accountId ?? walletAccounts[0]?.accountId ?? null;
}

function resolveWalletName({ wallet, accounts, contacts, identities, chains }: ResolveWalletNameParams): string {
  const walletAccounts = filterAccountsByWallet(accounts, wallet.id);
  const hasAccountsInList = walletAccounts.length > 0;

  const accountId = getWalletAccountId(wallet, accounts);
  if (nullable(accountId)) {
    return wallet.name;
  }

  const contact = contacts.find(contact => contact.accountId === accountId);
  if (contact) {
    return contact.name;
  }

  const walletAccount = walletAccounts.find(account => account.accountId === accountId);

  if (walletAccount && walletAccount.nameType === AccountNameType.CUSTOM) {
    return walletAccount.name;
  }

  const identity = getAccountIdentity(accountId, identities);
  if (identity) {
    return identityService.getFullName(identity);
  }

  if (!hasAccountsInList) {
    return wallet.name;
  }

  const accountForPrefix = walletAccount ?? getAccountById(accounts, accountId);
  const prefix = getAccountAddressPrefix(undefined, accountForPrefix, chains);
  return toShortAddress(toAddress(accountId, { prefix }), 5) || wallet.name;
}

function resolveAccountName({
  accountId,
  chain,
  accounts,
  contacts,
  identities,
  chains,
  title,
}: ResolveAccountNameParams): string {
  if (title) {
    return title;
  }

  const contact = contacts.find(contact => contact.accountId === accountId);
  if (contact) {
    return contact.name;
  }

  const relatedAccount = accounts.find(account => account.accountId === accountId);
  if (relatedAccount && isCustomAccountName(relatedAccount)) {
    return relatedAccount.name;
  }

  for (const chainId of keys(identities)) {
    const identity = identities[chainId]?.[accountId];
    if (identity) {
      return identity.name;
    }
  }

  let prefix = chain?.addressPrefix;

  if (!prefix) {
    if (relatedAccount && accountService.isChainAccount(relatedAccount)) {
      const accountChain = chains[relatedAccount.chainId];
      prefix = accountChain?.addressPrefix;
    }
  }

  return toShortAddress(toAddress(accountId, { prefix }), 5);
}

function hasPermissionToMakeActions(account: AnyAccount) {
  return accountActionPermissionAnyOf.check({ account });
}

function canSignMultipleTransactions(account: AnyAccount) {
  return accountCanSignMultipleAnyOf.check({ account });
}

/**
 * Generate unique node key for account graph.
 * For accounts with multiple connections, includes connection index.
 */
function getNodeKey(account: AnyAccount, connectionIndex?: number): string {
  // Use account.id if available, otherwise fallback to uniqId
  const baseKey = account.id || uniqId(account);
  if (connectionIndex !== undefined && connectionIndex > 0) {
    return `${baseKey}:conn:${connectionIndex}`;
  }
  return baseKey;
}

/**
 * Create accounts graph for given chain. Returns map, where key is a unique node ID
 * and value is graph node. For accounts with multiple connections (e.g., FlexibleMultisig),
 * multiple nodes are created (one per connection).
 */
function createAccountGraphs(accounts: AnyAccount[], chain: Chain): Map<string, AccountNode> {
  const chainAccounts = accounts.filter(account => isAccountAvailableOnChain(account, chain));
  const nodes = new Map<string, AccountNode>();

  const createNode = (account: AnyAccount, connectionIndex?: number): AccountNode => {
    const nodeKey = getNodeKey(account, connectionIndex);
    const existingNode = nodes.get(nodeKey);
    if (existingNode) return existingNode;

    const node: AccountNode = {
      account,
      children: [],
      connectionIndex,
    };
    nodes.set(nodeKey, node);

    const children = accountCollectChildrenPipeline([], { account, accounts: chainAccounts, connectionIndex });
    node.children = children.map(child => createNode(child));

    return node;
  };

  for (const account of chainAccounts) {
    // Check if feature registered a handler for multiple connections
    const connectionCount = accountConnectionCountTransformer({ account }) ?? 1;
    if (connectionCount > 1) {
      for (let i = 0; i < connectionCount; i++) {
        createNode(account, i);
      }
    } else {
      createNode(account);
    }
  }

  return nodes;
}

/**
 * Find node by account in the graph.
 * For flex accounts with multiple connections, returns the first matching node.
 */
function findNodeByAccount(graph: Map<string, AccountNode>, account: AnyAccount): AccountNode | null {
  // First try direct lookup
  const directNode = graph.get(account.id);
  if (directNode) return directNode;

  // For flex accounts, might be stored with connection index
  for (const node of graph.values()) {
    if (node.account === account) return node;
  }

  return null;
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
  const visited = new Set<string>();
  const visitNode = (node: AccountNode) => {
    const nodeKey = getNodeKey(node.account, node.connectionIndex);
    if (visited.has(nodeKey)) return;

    if (visitor.enter(node) === false) return false;

    visited.add(nodeKey);

    for (const child of node.children) {
      if (visitNode(child) === false) return false;
    }

    visitor.exit?.(node);
  };

  visitNode(node);
}

function findLeafs(account: AnyAccount, accounts: AnyAccount[], chain: Chain): AnyAccount[] {
  const graphs = createAccountGraphs(accounts, chain);
  const node = findNodeByAccount(graphs, account);
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
  const entryNode = findNodeByAccount(graphs, source);

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
  getBalance: (accountId: AccountId, chainId: ChainId, assetId: AssetId) => Balance | null;
  asset: Asset;
  api: ApiPromise;
};

async function validateRouteBalances({ api, route, getBalance, asset }: BalanceValidationParams) {
  const chainId = api.genesisHash.toHex();
  const balancesMap: BalanceMap = {};
  const unhandledAccounts = new Set<AnyAccount>(route);

  const getLocalBalance = (accountId: AccountId, chainId: ChainId, assetId: AssetId) => {
    const id = balanceUtils.constructBalanceId(accountId, chainId, assetId);
    return balancesMap[id] ?? getBalance(accountId, chainId, assetId);
  };

  const results: TransactionValidationBalanceError[] = [];

  for (const account of route) {
    const result = await validateRouteBalancesTransformer({
      account,
      route,
      getBalance: getLocalBalance,
      chainId,
      asset,
      api,
    });
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
  accountConnectionCountTransformer,
  validateRouteBalancesTransformer,
  validateCallPermissionTransformer,

  uniqId,

  isChainAccount,
  isUniversalAccount,
  isAccountAvailableOnChain,
  isAccountSchemeMatchChain,
  isCryptoMatch,
  isChainMatch,

  canSignMultipleTransactions,

  hasPermissionToMakeActions,

  filterAccountsOnChain,
  filterAccountsByWallet,
  getWalletAccountId,
  resolveWalletName,
  resolveAccountName,

  // graph

  createAccountGraphs,
  getNodeKey,
  findNodeByAccount,
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
