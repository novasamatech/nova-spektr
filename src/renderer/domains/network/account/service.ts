import { type ApiPromise } from '@polkadot/api';
import { createStore, sample } from 'effector';

import {
  type Asset,
  type AssetId,
  type Balance,
  type BalanceMap,
  type Chain,
  type ChainId,
  type Contact,
  type Wallet,
  AccountNameType,
  AccountType,
  WalletType,
  isBackendContact,
  isLocalContact,
} from '@/shared/core';
import { createAnyOf, createPipeline, createTransformer } from '@/shared/di';
import {
  isEthereumAccountId,
  keys,
  nullable,
  performSearch,
  toAccountId,
  toAddress,
  toShortAddress,
} from '@/shared/lib/utils';
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
const accountCollectChildrenPipeline = createPipeline<AnyAccount[], { account: AnyAccount; accounts: AnyAccount[] }>();
const $accountAvailabilityRevision = createStore(0);

sample({
  clock: accountAvailabilityOnChainAnyOf.updateHandlers,
  source: $accountAvailabilityRevision,
  fn: revision => revision + 1,
  target: $accountAvailabilityRevision,
});

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
  /**
   * A name to fall back to (typically the owning wallet's name) when the
   * account resolves to nothing better than its stored name or short address.
   * Unlike `title` it never beats an explicit name — custom account name,
   * contact or identity all still win.
   */
  fallbackName?: string;
  /**
   * The specific account this name is being resolved for, when the caller
   * already knows it. Skips the accountId-only lookup below, which cannot
   * disambiguate between different accounts (e.g. across wallets) that happen
   * to share the same accountId.
   */
  account?: AnyAccount;
};

/**
 * AccountId alone doesn't disambiguate between accounts that share it across
 * different wallets (e.g. a Vault derived key and an unrelated watch-only
 * account for the same address). Prefer a chain-matching account, then one with
 * a user-chosen (CUSTOM) name, before falling back to array order.
 */
function findRelatedAccount(
  accounts: AnyAccount[],
  accountId: AccountId,
  chain?: Chain | null,
): AnyAccount | undefined {
  const candidates = accounts.filter(account => account.accountId === accountId);
  if (candidates.length <= 1) {
    return candidates[0];
  }

  if (chain) {
    const chainMatch = candidates.find(
      account => accountService.isChainAccount(account) && account.chainId === chain.chainId,
    );
    if (chainMatch) {
      return chainMatch;
    }
  }

  return candidates.find(isCustomAccountName) ?? candidates[0];
}

/**
 * Resolves the exact account entity for a user selection (wallet + address) on
 * a chain. Key-set wallets hold several keys on one chain, so picking "any
 * account of the wallet" validates and signs with the wrong key — this is the
 * canonical way to turn a selection into an account. Prefers a chain-scoped key
 * when several accounts of the wallet share the accountId.
 */
function resolveSelectedAccount(
  accounts: AnyAccount[],
  { walletId, address, chain }: { walletId: number; address: string; chain: Chain },
): AnyAccount | null {
  if (!address) return null;

  const accountId = toAccountId(address);
  const candidates = accounts.filter(
    account =>
      account.walletId === walletId && account.accountId === accountId && isAccountAvailableOnChain(account, chain),
  );

  if (candidates.length <= 1) return candidates[0] ?? null;

  const chainMatch = candidates.find(account => isChainAccount(account) && account.chainId === chain.chainId);

  return chainMatch ?? candidates[0] ?? null;
}

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

  const walletAccount = walletAccounts.find(account => account.accountId === accountId);

  if (walletAccount && walletAccount.nameType === AccountNameType.CUSTOM) {
    return walletAccount.name;
  }

  if (nullable(walletAccount)) {
    return wallet.name;
  }

  const localContact = contacts.find(c => c.accountId === accountId && isLocalContact(c));
  if (localContact) {
    return localContact.name;
  }

  const backendContact = contacts.find(c => c.accountId === accountId && isBackendContact(c));
  if (backendContact) {
    return backendContact.name;
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

// The shape `toShortAddress` produces: two ends of an address around an
// ellipsis. The chunk size and the address prefix both vary by call site and by
// chain, so the shape — not a regenerated string — is what identifies it.
const SHORTENED_ADDRESS = String.raw`(?:0x)?[0-9a-zA-Z]{4,8}\.{3}[0-9a-zA-Z]{4,8}`;

// Names the app gives an account when the user never named it: the shortened
// address on its own, or a pure proxy's "<ProxyType> for pure <address>".
const GENERATED_ACCOUNT_NAME = new RegExp(`^(?:${SHORTENED_ADDRESS}|\\S+ for pure ${SHORTENED_ADDRESS})$`);

/**
 * Whether `name` reads as one the app generated rather than one the user typed.
 *
 * `nameType` is the real answer to that question, but it cannot be trusted on
 * older profiles: storage migration 14 stamped `CUSTOM` onto every account that
 * predated the flag — including multisigs and proxied wallets, whose names have
 * always been derived from their address. Migration 21 repaired Polkadot Vault
 * keys the same way; these wallet types were left behind, so "hide unnamed
 * wallets" skipped every multisig created before that migration.
 *
 * Matching the generated _shape_ rather than regenerating the exact string is
 * deliberate: the stored name may have been built with a different address
 * prefix or a different truncation length than the current code would use, and
 * an exact comparison misses those.
 */
function isGeneratedAccountName(name: string): boolean {
  return GENERATED_ACCOUNT_NAME.test(name);
}

function isWalletNameAutoGenerated({
  wallet,
  accounts,
  contacts,
  identities,
}: Omit<ResolveWalletNameParams, 'chains'>): boolean {
  const walletAccounts = filterAccountsByWallet(accounts, wallet.id);
  if (walletAccounts.length === 0) {
    return false;
  }

  const accountId = getWalletAccountId(wallet, accounts);
  if (nullable(accountId)) {
    return false;
  }

  const walletAccount = walletAccounts.find(account => account.accountId === accountId);
  if (nullable(walletAccount)) {
    return false;
  }

  if (walletAccount.nameType === AccountNameType.CUSTOM && !isGeneratedAccountName(walletAccount.name)) {
    return false;
  }

  if (contacts.some(c => c.accountId === accountId)) {
    return false;
  }

  if (getAccountIdentity(accountId, identities)) {
    return false;
  }

  return true;
}

function resolveAccountName({
  accountId,
  chain,
  accounts,
  contacts,
  identities,
  chains,
  title,
  fallbackName,
  account,
}: ResolveAccountNameParams): string {
  if (title) {
    return title;
  }

  const relatedAccount = account ?? findRelatedAccount(accounts, accountId, chain);
  if (relatedAccount && isCustomAccountName(relatedAccount)) {
    return relatedAccount.name;
  }

  const localContact = contacts.find(c => c.accountId === accountId && isLocalContact(c));
  if (localContact) {
    return localContact.name;
  }

  const backendContact = contacts.find(c => c.accountId === accountId && isBackendContact(c));
  if (backendContact) {
    return backendContact.name;
  }

  for (const chainId of keys(identities)) {
    const identity = identities[chainId]?.[accountId];
    if (identity) {
      return identity.name;
    }
  }

  // A caller-supplied fallback (e.g. the owning wallet's name) beats a generated
  // account name such as a Vault derivation path, but never an explicit name.
  if (fallbackName) {
    return fallbackName;
  }

  if (relatedAccount?.name) {
    return relatedAccount.name;
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

type SearchAccountsParams = {
  accounts: AnyAccount[];
  query: string;
  resolvedAccounts: Pick<AnyAccount, 'id' | 'name'>[];
  resolvedWallets: Pick<Wallet, 'id' | 'name'>[];
  addressPrefix?: number;
};

type SearchAccountsMeta = {
  displayName: string;
  walletName: string;
  displayAddress: string;
};

// Account name is what the user most likely types, wallet name narrows a group,
// address matters mostly for pasted values — hence the descending ranking.
const ACCOUNT_SEARCH_WEIGHTS = { displayName: 1, walletName: 0.75, displayAddress: 0.5 };

/**
 * Searches accounts by the strings a user actually sees in the list — resolved
 * account name, resolved wallet name and displayed address — instead of the raw
 * stored account name.
 */
function searchAccounts({
  accounts,
  query,
  resolvedAccounts,
  resolvedWallets,
  addressPrefix,
}: SearchAccountsParams): AnyAccount[] {
  // Keyed by account.id, not accountId — the same accountId can live in several
  // wallets with different resolved names, and the visible one must stay searchable.
  const namesByAccount = new Map(resolvedAccounts.map(a => [a.id, a.name]));
  const namesByWallet = new Map(resolvedWallets.map(w => [w.id, w.name]));

  return performSearch<AnyAccount, SearchAccountsMeta>({
    records: accounts,
    query,
    getMeta: account => ({
      displayName: namesByAccount.get(account.id) ?? account.name,
      walletName: namesByWallet.get(account.walletId) ?? '',
      displayAddress: toAddress(account.accountId, { prefix: addressPrefix }),
    }),
    weights: ACCOUNT_SEARCH_WEIGHTS,
  });
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
 * Derived accounts (multisig, flexible multisig, proxied) exist locally only
 * because a signable local account sits behind them as a signatory or
 * delegate.
 */
function isDerivedAccount(account: AnyAccount): boolean {
  if (!('accountType' in account)) return false;

  const { accountType } = account;

  return (
    accountType === AccountType.MULTISIG ||
    accountType === AccountType.FLEX_MULTISIG ||
    accountType === AccountType.PROXIED
  );
}

/**
 * Find derived accounts that no longer reach a signable local account on any
 * chain they are available on. Such an account is orphaned — its last local
 * signer is gone — so it can be removed from local state alone, without
 * consulting the indexer or the chain. The dependency graph is followed
 * recursively, so a chain of derived accounts (a proxied of a multisig of a
 * removed key) collapses in a single evaluation.
 *
 * An account is only considered when it could actually be placed in a graph on
 * at least one of the given chains; an account we cannot evaluate is kept.
 */
function findAccountsWithoutSigners(accounts: AnyAccount[], chains: Record<ChainId, Chain>): AnyAccount[] {
  const derivedAccounts = accounts.filter(isDerivedAccount);
  if (derivedAccounts.length === 0) {
    return [];
  }

  const evaluatedAccounts = new Set<AnyAccount>();
  const accountsWithSigner = new Set<AnyAccount>();

  for (const chain of Object.values(chains)) {
    const graphs = createAccountGraphs(accounts, chain);

    for (const [account, node] of graphs) {
      evaluatedAccounts.add(account);
      if (accountsWithSigner.has(account)) continue;

      let hasSigner = false;
      traverseGraph(node, {
        enter(current) {
          if (current.children.length === 0 && hasPermissionToMakeActions(current.account)) {
            hasSigner = true;
            // stop the traversal: one signable leaf is enough to keep the account
            return false;
          }
        },
      });

      if (hasSigner) {
        accountsWithSigner.add(account);
      }
    }
  }

  return derivedAccounts.filter(account => evaluatedAccounts.has(account) && !accountsWithSigner.has(account));
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
  $accountAvailabilityRevision,
  accountActionPermissionAnyOf,
  accountCanSignMultipleAnyOf,
  accountCollectChildrenPipeline,
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
  findRelatedAccount,
  resolveSelectedAccount,
  getWalletAccountId,
  resolveWalletName,
  isWalletNameAutoGenerated,
  resolveAccountName,
  searchAccounts,

  // graph

  createAccountGraphs: createAccountGraphs,
  findLeafs,
  findSignatories,
  findAccountsWithoutSigners,
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
