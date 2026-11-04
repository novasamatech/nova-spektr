import { type Balance, type Chain, type ChainId, type Connection } from '@/shared/core';
import { isEthereumAccountId } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';
import { networkUtils } from '@/entities/network';

export type BalanceCoverage = {
  /**
   * Every selected account that is expected to receive balances has at least
   * one record, and at least one selected account has any record at all.
   */
  complete: boolean;
  /**
   * Selected accounts that live on at least one chain but have no balance
   * record yet.
   */
  awaiting: string[];
};

/**
 * Account ids (of the given selection) that can hold balances on at least one
 * of the enabled chains — mirrors which balances the dashboard actually
 * requests:
 *
 * - a wallet account is requested on the chains it is available on;
 * - an id with no wallet account (a contact) is requested on every chain of a
 *   matching address scheme;
 * - nothing is requested on a chain whose connection the user disabled — it
 *   never connects, so a record never lands. A chain that is merely
 *   connecting or disconnected still counts: it is retried and answers later.
 *
 * An id that fits no enabled chain is never requested, so it must not be
 * waited for.
 */
export const getAccountsWithChains = (
  accountIds: string[],
  allAccounts: AnyAccount[],
  chains: Chain[],
  connections: Record<ChainId, Connection>,
): Set<string> => {
  const enabledChains = chains.filter((chain) => {
    const connection = connections[chain.chainId];

    return !connection || !networkUtils.isDisabledConnection(connection);
  });

  const selected = new Set(accountIds);
  const walletAccounts = new Map<string, AnyAccount[]>();

  for (const account of allAccounts) {
    if (!selected.has(account.accountId)) continue;

    const list = walletAccounts.get(account.accountId) ?? [];
    list.push(account);
    walletAccounts.set(account.accountId, list);
  }

  const result = new Set<string>();

  for (const accountId of accountIds) {
    const known = walletAccounts.get(accountId);

    const hasChain = known
      ? enabledChains.some((chain) => known.some((account) => accountService.isAccountAvailableOnChain(account, chain)))
      : enabledChains.some((chain) => isSchemeMatch(accountId, chain));

    if (hasChain) result.add(accountId);
  }

  return result;
};

// Same rule as `accountService.isAccountSchemeMatchChain`, over a plain id string.
const isSchemeMatch = (accountId: string, chain: Chain) => {
  return networkUtils.isEthereumBased(chain.options) === isEthereumAccountId(accountId);
};

/**
 * Whether the balance store has answered for the whole selection.
 *
 * A record is written for every (account, chain, asset) pair a fetch queries,
 * zero balances included, so an account with no record at all has not been
 * read yet — as opposed to one that was read and holds nothing. The selection
 * counts as covered only once every account that can hold balances somewhere
 * has at least one record; one fast account must not stand in for the rest.
 *
 * The scan stops as soon as every awaited account has a record — the store
 * holds a record per asset, so a complete selection is answered long before
 * the end of the map.
 */
export const getBalanceCoverage = (
  balances: Iterable<Balance>,
  accountIds: string[],
  accountsWithChains: Set<string>,
): BalanceCoverage => {
  if (accountIds.length === 0) return { complete: false, awaiting: [] };

  const selected = new Set(accountIds);
  const expected = new Set(accountIds.filter((accountId) => accountsWithChains.has(accountId)));
  const expectedWithRecords = new Set<string>();
  let hasAnyRecord = false;

  for (const balance of balances) {
    if (!selected.has(balance.accountId)) continue;

    hasAnyRecord = true;
    if (expected.has(balance.accountId)) {
      expectedWithRecords.add(balance.accountId);
    }
    if (expectedWithRecords.size === expected.size) break;
  }

  const awaiting = accountIds.filter((accountId) => expected.has(accountId) && !expectedWithRecords.has(accountId));

  return { complete: hasAnyRecord && awaiting.length === 0, awaiting };
};
