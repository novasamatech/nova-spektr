import { type Balance, type Chain, type ChainId, type Connection, type ConnectionStatus } from '@/shared/core';
import { isEthereumAccountId } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';
import { networkUtils } from '@/entities/network';

export type BalanceCoverage = {
  /**
   * Every selected account has at least one record on every connected chain it
   * is requested on, and at least one selected account has any record at all.
   */
  complete: boolean;
  /**
   * Selected accounts still without a balance record on at least one connected
   * chain they are requested on.
   */
  awaiting: string[];
};

/**
 * Per chain: the selected account ids whose balances are requested on it. Only
 * chains with at least one such account are listed.
 */
export type RequestedChains = Map<ChainId, string[]>;

/**
 * Which balances of the given selection are requested, chain by chain — the
 * same accounts the dashboard fetches (`getEntryAccounts`):
 *
 * - each of `entryAccounts` (the wallet accounts of the selected keys) is
 *   requested on the chains it is available on, so a key that exists as several
 *   accounts is requested on the chains of all of them;
 * - a selected id with no entry account (a contact) is requested on every chain
 *   of a matching address scheme;
 * - nothing is requested on a chain whose connection the user disabled — it
 *   never connects, so a record never lands;
 * - a chain without assets has nothing to write a record for, so it is never
 *   requested either.
 *
 * Connection statuses are left out on purpose: they flip far more often than
 * the selection, and are applied on top by {@link getChainStates}.
 */
export const getRequestedChains = (
  accountIds: string[],
  entryAccounts: AnyAccount[],
  chains: Chain[],
  connections: Record<ChainId, Connection>,
): RequestedChains => {
  const selected = new Set(accountIds);
  const accountsById = new Map<string, AnyAccount[]>();

  for (const account of entryAccounts) {
    if (!selected.has(account.accountId)) continue;

    const list = accountsById.get(account.accountId) ?? [];
    list.push(account);
    accountsById.set(account.accountId, list);
  }

  const requested: RequestedChains = new Map();

  for (const chain of chains) {
    if (chain.assets.length === 0) continue;

    const connection = connections[chain.chainId];
    if (connection && networkUtils.isDisabledConnection(connection)) continue;

    const requestedIds: string[] = [];
    for (const accountId of selected) {
      const known = accountsById.get(accountId);
      const isRequested = known
        ? known.some((account) => accountService.isAccountAvailableOnChain(account, chain))
        : isSchemeMatch(accountId, chain);

      if (isRequested) requestedIds.push(accountId);
    }

    if (requestedIds.length > 0) requested.set(chain.chainId, requestedIds);
  }

  return requested;
};

export type ChainStates = {
  /** Requested chains that are connected, in the order of `requested`. */
  connected: ChainId[];
  /** Some requested chain is connecting right now — its balances are about to come. */
  connecting: boolean;
};

/**
 * Where the requested chains of a selection stand. Only a connected chain can
 * answer, so only connected chains are waited for. A chain that is connecting
 * does not hold the selection back; it is reported as `connecting` instead. A
 * chain that is disconnected or failing is neither: it may stay down for the
 * life of the app, so it is not waited for and not announced as on its way.
 */
export const getChainStates = (
  requested: RequestedChains,
  statuses: Record<ChainId, ConnectionStatus>,
): ChainStates => {
  const connected: ChainId[] = [];
  let connecting = false;

  for (const chainId of requested.keys()) {
    const status = statuses[chainId];
    if (!status) continue;

    if (networkUtils.isConnectedStatus(status)) {
      connected.push(chainId);
    } else if (networkUtils.isConnectingStatus(status)) {
      connecting = true;
    }
  }

  return { connected, connecting };
};

/**
 * Per selected account id: the connected chains its balances are requested
 * on — the (account, chain) pairs {@link getBalanceCoverage} waits for. An
 * account requested on no connected chain has no entry, so it is not waited
 * for yet.
 */
export const getAwaitedChains = (requested: RequestedChains, connected: ChainId[]): Map<string, Set<ChainId>> => {
  const awaited = new Map<string, Set<ChainId>>();

  for (const chainId of connected) {
    for (const accountId of requested.get(chainId) ?? []) {
      const chainIds = awaited.get(accountId) ?? new Set<ChainId>();
      chainIds.add(chainId);
      awaited.set(accountId, chainIds);
    }
  }

  return awaited;
};

// Same rule as `accountService.isAccountSchemeMatchChain`, over a plain id string.
const isSchemeMatch = (accountId: string, chain: Chain) => {
  return networkUtils.isEthereumBased(chain.options) === isEthereumAccountId(accountId);
};

/**
 * Whether the balance store has answered for the whole selection.
 *
 * A record is written for every (account, chain, asset) pair a fetch queries,
 * zero balances included, so an account with no record on a chain has not been
 * read there yet — as opposed to one that was read and holds nothing. The
 * selection counts as covered only once every account has at least one record
 * on every chain in `chainsByAccount`; one fast account must not stand in for
 * the rest, and one fast chain must not stand in for the other chains.
 *
 * The scan stops as soon as every awaited (account, chain) pair has a record.
 */
export const getBalanceCoverage = (
  balances: Iterable<Balance>,
  accountIds: string[],
  chainsByAccount: Map<string, Set<ChainId>>,
): BalanceCoverage => {
  if (accountIds.length === 0) return { complete: false, awaiting: [] };

  const selected = new Set(accountIds);
  let expectedPairs = 0;
  for (const accountId of selected) {
    expectedPairs += chainsByAccount.get(accountId)?.size ?? 0;
  }

  const coveredChains = new Map<string, Set<ChainId>>();
  let coveredPairs = 0;
  let hasAnyRecord = false;

  for (const balance of balances) {
    if (!selected.has(balance.accountId)) continue;

    hasAnyRecord = true;
    if (chainsByAccount.get(balance.accountId)?.has(balance.chainId)) {
      const covered = coveredChains.get(balance.accountId) ?? new Set<ChainId>();
      if (!covered.has(balance.chainId)) {
        covered.add(balance.chainId);
        coveredChains.set(balance.accountId, covered);
        coveredPairs += 1;
      }
    }
    if (coveredPairs === expectedPairs) break;
  }

  // Covered chains are always a subset of the expected ones, so sizes compare.
  const awaiting = accountIds.filter((accountId) => {
    return (chainsByAccount.get(accountId)?.size ?? 0) > (coveredChains.get(accountId)?.size ?? 0);
  });

  return { complete: hasAnyRecord && awaiting.length === 0, awaiting };
};
