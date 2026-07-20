import { endOfDay, isAfter, isWithinInterval, startOfDay } from 'date-fns';

import { type Chain, type ChainId } from '@/shared/core';
import { type DateRange } from '@/shared/ui-kit';
import { type Draft } from '@/domains/backend';
import { type OperationSearchRow, type SearchAccountRef } from '@/aggregates/operations-search';

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

/**
 * Reduces a draft to the accounts its row displays, for the shared search. A
 * draft is chain-bound, so every one of them renders with `draft.chainId`.
 *
 * All three accounts are searchable, not just the one in the collapsed row: the
 * proxy and the multisig both appear in the expanded details, and the initiator
 * is what a user is usually looking for ("which drafts is Adam expected to
 * submit?").
 *
 * Initiator precedence follows the details panel (DraftFullInfo), which treats
 * a stored signing path as the source of truth and only reconstructs from
 * `initiatorAccountId` when the path is empty — otherwise the search could
 * match a name the panel never shows. A draft with neither stays out of
 * initiator queries entirely.
 */
export const buildDraftSearchRow = (draft: Draft, chains: Record<ChainId, Chain>): OperationSearchRow => {
  const chain = chains[draft.chainId] ?? null;
  const lastPathNode = draft.signingPath.at(-1);
  const pathInitiator = lastPathNode?.kind === 'signer' ? lastPathNode.accountId : null;
  const initiatorAccountId = pathInitiator ?? draft.initiatorAccountId;

  const accounts: SearchAccountRef[] = [];

  if (draft.proxyAccountId) {
    accounts.push({
      accountId: draft.proxyAccountId,
      chain,
      // DraftRow renders a proxied draft through a synthetic wallet named after
      // the proxy contact, and <NamedAccount> takes a wallet name as a hard
      // override — so this is the string on screen, and it must be matchable.
      walletName: draft.proxyContact?.name ?? null,
    });
  }

  if (draft.multisigAccountId) {
    accounts.push({ accountId: draft.multisigAccountId, chain, walletName: null });
  }

  if (initiatorAccountId) {
    accounts.push({ accountId: initiatorAccountId, chain, walletName: null });
  }

  return {
    id: draft.id,
    accounts,
    description: draft.description,
    callHash: null,
  };
};

/**
 * Applies the Operations view's non-status filters to drafts, so the drafts
 * section and the merged "All operations" count stay consistent with the
 * filtered operations list. Status gating is handled separately by the caller
 * (drafts match only the dedicated `drafts` status).
 *
 * `searchMatchedIds` is computed by the caller (it needs resolved display
 * names) and is `null` when there is no query.
 */
export const filterDraftsByScope = (
  drafts: Draft[],
  scope: DraftListScope,
  searchMatchedIds: Set<string> | null,
): Draft[] => {
  if (scope.type.length > 0 || scope.proxyType.length > 0) return [];

  return drafts.filter(
    (draft) =>
      matchesNetwork(draft, scope.network) &&
      matchesDateRange(draft, scope.dateRange) &&
      (searchMatchedIds === null || searchMatchedIds.has(draft.id)),
  );
};
