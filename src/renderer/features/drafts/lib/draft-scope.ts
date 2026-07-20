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
 * Reduces a draft to the accounts its row displays, for the shared search. A
 * draft is chain-bound, so every one of them renders with `draft.chainId`.
 *
 * The searchable set is **every node of the stored signing path**, which is
 * exactly what the details panel lists (DraftFullInfo renders one row per node,
 * labelled Proxied → Multisig → Initiator). Deriving it from the path rather
 * than from the flat `proxyAccountId` / `multisigAccountId` /
 * `initiatorAccountId` fields matters for nested multisigs, where
 * `multisigAccountId` is the deepest hop and the root multisig appears only in
 * the path.
 *
 * Legacy drafts with no path fall back to the flat fields — the same
 * reconstruction the panel does, and in the same order.
 */
export const buildDraftSearchRow = (
  draft: Draft,
  chains: Record<ChainId, Chain>,
  resolveWalletName: (accountId: AccountId, chain?: Chain | null) => string | null,
): OperationSearchRow => {
  const chain = chains[draft.chainId] ?? null;
  // Matches the defensive reads in submit-draft-model: the zod default makes
  // this an array after parsing, but drafts also arrive from cached payloads.
  const signingPath = Array.isArray(draft.signingPath) ? draft.signingPath : [];

  // The collapsed row shows this one through <NamedAccount wallet={…}>, whose
  // wallet name is a hard override — so it is the only account whose wallet name
  // is on screen, and the only one that needs resolving.
  const submitterAccountId = draft.proxyAccountId ?? draft.multisigAccountId;

  const pathAccountIds =
    signingPath.length > 0
      ? signingPath.map((node) => node.accountId)
      : [draft.proxyAccountId, draft.multisigAccountId, draft.initiatorAccountId];

  const accounts: SearchAccountRef[] = [];
  const seen = new Set<AccountId>();

  for (const accountId of [submitterAccountId, ...pathAccountIds]) {
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
