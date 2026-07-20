import { type Chain } from '@/shared/core';
import { performSearch } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type SearchResolvers } from './account-name';

/**
 * One account a row puts on screen, with the chain its address is _rendered_
 * with — so the query matches the address the user can actually see.
 *
 * `walletName` carries the name `<NamedAccount wallet={…}>` displays: the
 * wallet name is passed in as `title`, which is a hard override winning over
 * the whole resolution chain. Without it the search would match a name the row
 * never shows and miss the one it does.
 */
export type SearchAccountRef = {
  accountId: AccountId;
  chain: Chain | null;
  walletName: string | null;
};

/**
 * A row of the operations table — an operation or a draft — reduced to the
 * strings it displays. Both row types share one shape so a single query behaves
 * the same across the list; they used to run separate hand-rolled matchers that
 * searched different fields.
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

// Only *whether* a field matches matters, never the ranking — see the Set return
// below — so these weights just have to be non-zero. They are kept meaningful so
// the order is right should a caller ever want the ranked list.
const SEARCH_WEIGHTS = {
  accountNames: 1,
  descriptionText: 0.75,
  accountAddresses: 0.5,
  callHashText: 0.5,
};

// A row's account strings are matched as one joined blob. The separator is a
// newline so a query can never span two accounts by accident.
const JOIN = '\n';

/**
 * Returns the ids of rows matching the query, or `null` when the query is empty
 * (meaning "no search filter"), so callers can skip the work entirely.
 *
 * A `Set` rather than the sorted list `performSearch` returns: both lists carry
 * a meaningful order (operations by the active sort, drafts newest first), and
 * re-ranking them by match weight would scramble it. `performSearch` sorts
 * internally and that work is discarded here — the cost is one sort over the
 * already-matched subset, which is not worth a second search engine to avoid.
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
        .flatMap(account => [account.walletName ?? '', resolvers.resolveAccountName(account.accountId, account.chain)])
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
