import { endOfDay, isAfter, isWithinInterval, startOfDay } from 'date-fns';

import { type Chain, type ChainId } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type DateRange } from '@/shared/ui-kit';
import { type Draft } from '@/domains/backend';

/**
 * The subset of the Operations view's filters a draft can honor. A draft's
 * transaction type and proxy type are not decodable at filter time (call data
 * may be absent or undecoded), so an active type/proxyType filter puts every
 * draft out of scope.
 */
export type DraftListScope = {
  network: string[];
  type: string[];
  proxyType: string[];
  dateRange?: DateRange;
  searchQuery: string;
};

const matchesNetwork = (draft: Draft, networkIds: string[]): boolean => {
  return networkIds.length === 0 || networkIds.includes(draft.chainId);
};

// Mirrors matchesDateRange semantics for operations (operations-filter.ts).
const matchesDateRange = (draft: Draft, dateRange: DateRange | undefined): boolean => {
  if (!dateRange?.from && !dateRange?.to) return true;
  const { from, to } = dateRange;
  const createdDate = new Date(draft.createdAt);

  if (from && to) {
    return isWithinInterval(createdDate, { start: startOfDay(from), end: endOfDay(to) });
  }
  if (from) {
    return isAfter(createdDate, startOfDay(from)) || createdDate.getTime() === startOfDay(from).getTime();
  }
  return true;
};

const matchesSearch = (draft: Draft, searchQuery: string, chains: Record<ChainId, Chain>): boolean => {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return true;

  const prefix = chains[draft.chainId]?.addressPrefix;
  const addresses = [draft.multisigAccountId, draft.proxyAccountId]
    .filter((accountId) => accountId !== null && accountId !== undefined)
    .map((accountId) => toAddress(accountId, { prefix }).toLowerCase());

  return (
    (draft.description ?? '').toLowerCase().includes(query) || addresses.some((address) => address.includes(query))
  );
};

/**
 * Applies the Operations view's non-status filters to drafts, so the drafts
 * section and the merged "All operations" count stay consistent with the
 * filtered operations list. Status gating is handled separately by the caller
 * (drafts match only the dedicated `drafts` status).
 */
export const filterDraftsByScope = (
  drafts: Draft[],
  scope: DraftListScope,
  chains: Record<ChainId, Chain>,
): Draft[] => {
  if (scope.type.length > 0 || scope.proxyType.length > 0) return [];

  return drafts.filter(
    (draft) =>
      matchesNetwork(draft, scope.network) &&
      matchesDateRange(draft, scope.dateRange) &&
      matchesSearch(draft, scope.searchQuery, chains),
  );
};
