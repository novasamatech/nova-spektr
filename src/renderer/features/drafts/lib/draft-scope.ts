import { endOfDay, isAfter, isWithinInterval, startOfDay } from 'date-fns';

import { type Chain, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
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
 * Searches every hop of the signing path, which is what the details panel
 * lists. The flat `multisigAccountId` holds only the deepest hop, so for a
 * nested multisig the root would otherwise be unsearchable. Legacy drafts with
 * no path fall back to the flat fields, as the panel does.
 */
export const buildDraftSearchRow = (
  draft: Draft,
  chains: Record<ChainId, Chain>,
  resolveWalletName: (accountId: AccountId, chain?: Chain | null) => string | null,
): OperationSearchRow => {
  const chain = chains[draft.chainId] ?? null;
  // Matches the defensive reads in submit-draft-model — drafts also arrive from
  // cached payloads that never went through the schema.
  const signingPath = Array.isArray(draft.signingPath) ? draft.signingPath : [];

  // The only account whose wallet name reaches the screen (collapsed row).
  const submitterAccountId = draft.proxyAccountId ?? draft.multisigAccountId;

  const pathAccountIds =
    signingPath.length > 0
      ? signingPath.map((node) => node.accountId)
      : [draft.proxyAccountId, draft.multisigAccountId, draft.initiatorAccountId];

  const accounts: SearchAccountRef[] = [];
  const seen = new Set<AccountId>();

  // Initiator has its own column, so make it searchable even when it isn't the
  // signing path's last hop (malformed drafts). Deduped by `seen` below.
  for (const accountId of [submitterAccountId, ...pathAccountIds, draft.initiatorAccountId]) {
    if (!accountId || seen.has(accountId)) continue;
    seen.add(accountId);

    accounts.push({
      accountId,
      chain,
      walletName:
        accountId === submitterAccountId
          ? // A proxied draft renders through a synthetic wallet named after the
            // proxy contact, which no resolver produces.
            (draft.proxyContact?.name ?? resolveWalletName(accountId, chain))
          : null,
    });
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
 * `searchMatchedIds` comes from the caller because it needs resolved display
 * names; `null` means no query.
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
