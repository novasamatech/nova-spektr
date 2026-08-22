import { endOfDay, isAfter, isWithinInterval, startOfDay } from 'date-fns';

import { type Chain, type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
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
  /**
   * "Needs my signature": keep only drafts whose assigned initiator is a local
   * account that can sign (see `filterDraftsByScope`'s `localSignerIds`).
   */
  needsMySignature?: boolean;
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

// A draft is "mine" when the account assigned to submit it is one the user can
// sign with — the same rule submit-draft-model uses to enable Submit.
const hasLocalInitiator = (draft: Draft, localSignerIds: Set<string>): boolean => {
  return nonNullable(draft.initiatorAccountId) && localSignerIds.has(draft.initiatorAccountId);
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

    if (accountId === submitterAccountId) {
      accounts.push({
        accountId,
        chain,
        // A proxied draft renders through a synthetic wallet named after the
        // proxy contact, which no resolver produces.
        walletName: draft.proxyContact?.name ?? resolveWalletName(accountId, chain),
      });
      continue;
    }

    // Every other hop — the Initiator cell and each node the details panel
    // lists — renders `<NamedAccount walletNameAs="fallback">`: the account's
    // own name, with the owning wallet's name filling in. Search matches
    // exactly that one name.
    accounts.push({
      accountId,
      chain,
      walletName: resolveWalletName(accountId, chain),
      walletNameAs: 'fallback',
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
 * names; `null` means no query. `localSignerIds` — account ids of the local
 * accounts allowed to sign — is consulted only when `scope.needsMySignature` is
 * set.
 */
export const filterDraftsByScope = (
  drafts: Draft[],
  scope: DraftListScope,
  searchMatchedIds: Set<string> | null,
  localSignerIds: Set<string>,
): Draft[] => {
  if (scope.type.length > 0 || scope.proxyType.length > 0) return [];

  return drafts.filter(
    (draft) =>
      matchesNetwork(draft, scope.network) &&
      matchesDateRange(draft, scope.dateRange) &&
      (searchMatchedIds === null || searchMatchedIds.has(draft.id)) &&
      (!scope.needsMySignature || hasLocalInitiator(draft, localSignerIds)),
  );
};
