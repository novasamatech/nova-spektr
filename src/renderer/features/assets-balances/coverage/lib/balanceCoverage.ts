import { type Balance, type Chain } from '@/shared/core';
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
 * of the chains — mirrors which balances the dashboard actually requests:
 *
 * - a wallet account is requested on the chains it is available on;
 * - an id with no wallet account (a contact) is requested on every chain of a
 *   matching address scheme.
 *
 * An id that fits no chain is never requested, so it must not be waited for.
 */
export const getAccountsWithChains = (accountIds: string[], allAccounts: AnyAccount[], chains: Chain[]): Set<string> => {
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
      ? chains.some((chain) => known.some((account) => accountService.isAccountAvailableOnChain(account, chain)))
      : chains.some((chain) => isSchemeMatch(accountId, chain));

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
 */
export const getBalanceCoverage = (
  balances: Iterable<Balance>,
  accountIds: string[],
  accountsWithChains: Set<string>,
): BalanceCoverage => {
  if (accountIds.length === 0) return { complete: false, awaiting: [] };

  const selected = new Set(accountIds);
  const withRecords = new Set<string>();

  for (const balance of balances) {
    if (selected.has(balance.accountId)) {
      withRecords.add(balance.accountId);
    }
  }

  const awaiting = accountIds.filter((accountId) => accountsWithChains.has(accountId) && !withRecords.has(accountId));

  return { complete: withRecords.size > 0 && awaiting.length === 0, awaiting };
};
