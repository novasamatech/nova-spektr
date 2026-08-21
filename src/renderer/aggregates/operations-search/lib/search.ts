import { type Chain } from '@/shared/core';
import { performSearch } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type WalletNameMode } from '@/domains/network';

import { type SearchResolvers } from './account-name';

export type SearchAccountRef = {
  accountId: AccountId;
  /**
   * The chain the row _renders_ this address with, so the query matches what's
   * on screen.
   */
  chain: Chain | null;
  walletName: string | null;
  /**
   * Mirrors `<NamedAccount walletNameAs>`. `override` (default): the row
   * displays the wallet name outright, so both it and the resolved account name
   * are searchable. `fallback`: the row displays one name — the account's own,
   * with the wallet name filling in — and the query matches exactly that.
   */
  walletNameAs?: WalletNameMode;
};

/**
 * One shape for both row types, so a single query behaves the same across the
 * list.
 */
export type OperationSearchRow = {
  id: string;
  accounts: SearchAccountRef[];
  description: string | null;
  callHash: string | null;
};

type SearchMeta = {
  accountNames: string;
  accountAddresses: string;
  descriptionText: string;
  callHashText: string;
};

// Ranking is discarded (see the Set return), so these only have to be non-zero;
// they stay meaningful in case a caller ever wants the ranked list.
const SEARCH_WEIGHTS = {
  accountNames: 1,
  descriptionText: 0.75,
  accountAddresses: 0.5,
  callHashText: 0.5,
};

// Newline, so a query can never match across two accounts.
const JOIN = '\n';

/**
 * `null` means "no query" — callers skip filtering entirely.
 *
 * A Set rather than `performSearch`'s sorted list: both lists carry a
 * meaningful order (operations by the active sort, drafts newest first) that
 * re-ranking would scramble. Its internal sort is wasted here, which is cheaper
 * than maintaining a second search engine.
 */
export const searchOperationRows = (
  rows: OperationSearchRow[],
  query: string,
  resolvers: Pick<SearchResolvers, 'resolveAccountName' | 'resolveAddress'>,
): Set<string> | null => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return null;

  const matched = performSearch<OperationSearchRow, SearchMeta>({
    records: rows,
    query: trimmedQuery,
    getMeta: row => ({
      accountNames: row.accounts
        .flatMap(account =>
          account.walletNameAs === 'fallback'
            ? [resolvers.resolveAccountName(account.accountId, account.chain, account.walletName ?? undefined)]
            : [account.walletName ?? '', resolvers.resolveAccountName(account.accountId, account.chain)],
        )
        .join(JOIN),
      accountAddresses: row.accounts
        .map(account => resolvers.resolveAddress(account.accountId, account.chain))
        .join(JOIN),
      descriptionText: row.description ?? '',
      callHashText: row.callHash ?? '',
    }),
    weights: SEARCH_WEIGHTS,
  });

  return new Set(matched.map(row => row.id));
};

export const haveSameMatchedIds = (next: Set<string> | null, prev: Set<string> | null): boolean => {
  if (next === null || prev === null) return next === prev;
  if (next.size !== prev.size) return false;

  for (const id of next) {
    if (!prev.has(id)) return false;
  }

  return true;
};
