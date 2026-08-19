import { type Address, type ID, WalletType } from '@/shared/core';
import { type ContactField } from '@/shared/core/types/contact';

import { type AccountEntry, type AccountPreset, type AccountSource, type PresetFilterCriteria } from './types';

export const INDEXED_WALLET_TYPES = new Set<WalletType>([
  WalletType.MULTISIG,
  WalletType.FLEXIBLE_MULTISIG,
  WalletType.PROXIED,
]);

export const isIndexedWallet = (walletType: WalletType | undefined): boolean =>
  walletType !== undefined && INDEXED_WALLET_TYPES.has(walletType);

export type SourceBreakdownKey = 'wallet' | 'indexed' | 'localContact' | 'backendContact';
export type SourceBreakdown = Record<SourceBreakdownKey, number>;

export const computeSourceBreakdown = (entries: AccountEntry[]): SourceBreakdown => {
  const breakdown: SourceBreakdown = { wallet: 0, indexed: 0, localContact: 0, backendContact: 0 };
  for (const entry of entries) {
    if (entry.sources.includes('wallet')) {
      if (isIndexedWallet(entry.walletType)) {
        breakdown.indexed++;
      } else {
        breakdown.wallet++;
      }
    }
    if (entry.sources.includes('local-contact')) breakdown.localContact++;
    if (entry.sources.includes('backend-contact')) breakdown.backendContact++;
  }

  return breakdown;
};

/**
 * Presets persisted by older app versions may lack newer criteria fields or
 * carry retired ones (name-keyed entity/category/type/tag lists) — pick only
 * the current shape and default the rest.
 */
export const normalizePresetFilters = (filters: Partial<PresetFilterCriteria>): PresetFilterCriteria => ({
  sources: filters.sources ?? [],
  chainIds: filters.chainIds ?? [],
  fields: filters.fields ?? [],
});

export function applyPresetFilter(filters: PresetFilterCriteria, entries: AccountEntry[]): AccountEntry[] {
  const { sources, chainIds, fields } = normalizePresetFilters(filters);
  // A criterion with no options selected constrains nothing.
  const fieldCriteria = fields.filter(criterion => criterion.options.length > 0);
  const needsBackendMetadata = chainIds.length > 0 || fieldCriteria.length > 0;

  return entries.filter(entry => {
    if (sources.length > 0 && !sources.some(s => entry.sources.includes(s))) return false;

    if (!needsBackendMetadata) return true;
    if (!entry.sources.includes('backend-contact')) return false;

    if (chainIds.length > 0 && (entry.chainId == null || !chainIds.includes(entry.chainId))) return false;

    // sources.includes('backend-contact') guarantees this is populated by buildMergedEntries.
    const entryFields = entry.fields!;

    return fieldCriteria.every(criterion => {
      const group = entryFields.find(f => f.fieldId === criterion.fieldId);
      if (!group) return false;

      return criterion.options.some(option => group.values.some(v => v.optionId === option.id));
    });
  });
}

export function matchPreset(preset: AccountPreset | null, entries: AccountEntry[]): AccountEntry[] {
  if (!preset) return entries;

  if (preset.type === 'custom') {
    const selected = new Set(preset.selectedIds);
    return entries.filter(e => selected.has(e.id));
  }

  return applyPresetFilter(preset.filters, entries);
}

// -------- merge --------

export type WalletEntrySeed = {
  id: string;
  name: string;
  address: Address;
  accountId: string;
  walletId: ID;
  walletName?: string;
  walletType?: WalletType;
};

export type LocalContactSeed = {
  id: string;
  name: string;
  address: Address;
  accountId: string;
};

export type BackendContactSeed = {
  id: string;
  name: string;
  address: Address;
  accountId: string;
  chainId: string | null;
  fields: ContactField[];
};

type Draft = {
  id: string;
  accountId: string;
  address: Address;
  sources: AccountSource[];
  walletId?: ID;
  walletName?: string;
  walletType?: WalletType;
  walletAccountName?: string;
  localContactName?: string;
  backendContactName?: string;
  chainId?: string | null;
  fields?: ContactField[];
};

const pushSource = (draft: Draft, source: AccountSource) => {
  if (!draft.sources.includes(source)) draft.sources.push(source);
};

const resolveDisplayName = (draft: Draft): string => {
  const wallet = draft.walletAccountName?.trim();
  const local = draft.localContactName?.trim();
  const backend = draft.backendContactName?.trim();

  if (wallet && draft.walletType !== undefined && !isIndexedWallet(draft.walletType)) {
    return wallet;
  }
  if (backend) return backend;
  if (local) return local;
  if (wallet) return wallet;

  return '';
};

const resolveAliases = (draft: Draft): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of [draft.walletAccountName, draft.localContactName, draft.backendContactName]) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
};

const finalizeDraft = (draft: Draft): AccountEntry => {
  const entry: AccountEntry = {
    id: draft.id,
    name: resolveDisplayName(draft),
    address: draft.address,
    accountId: draft.accountId,
    aliases: resolveAliases(draft),
    sources: draft.sources,
  };
  if (draft.sources.includes('wallet')) {
    entry.walletId = draft.walletId;
    entry.walletName = draft.walletName;
    entry.walletType = draft.walletType;
  }
  if (draft.sources.includes('backend-contact')) {
    entry.chainId = draft.chainId ?? null;
    entry.fields = draft.fields ?? [];
  }

  return entry;
};

/**
 * Merge wallet accounts, local contacts, and backend (external) contacts into a
 * single list keyed by `accountId`. When the same address appears in multiple
 * sources, all metadata is layered onto one entry; the `id` and `address` come
 * from the highest-priority source present (`wallet > local-contact >
 * backend-contact`).
 *
 * `name` and `aliases` are derived once at the end via fixed rules — see
 * `resolveDisplayName` / `resolveAliases`.
 */
export function buildMergedEntries({
  walletSeeds,
  localContacts,
  backendContacts,
}: {
  walletSeeds: WalletEntrySeed[];
  localContacts: LocalContactSeed[];
  backendContacts: BackendContactSeed[];
}): AccountEntry[] {
  const byAccountId = new Map<string, Draft>();

  const ensureDraft = (params: { id: string; accountId: string; address: Address; source: AccountSource }): Draft => {
    let draft = byAccountId.get(params.accountId);
    if (!draft) {
      draft = {
        id: params.id,
        accountId: params.accountId,
        address: params.address,
        sources: [],
      };
      byAccountId.set(params.accountId, draft);
    }
    pushSource(draft, params.source);

    return draft;
  };

  for (const seed of walletSeeds) {
    const draft = ensureDraft({ id: seed.id, accountId: seed.accountId, address: seed.address, source: 'wallet' });
    draft.walletId = seed.walletId;
    draft.walletName = seed.walletName;
    draft.walletType = seed.walletType;
    draft.walletAccountName = seed.name;
  }

  for (const contact of localContacts) {
    const draft = ensureDraft({
      id: contact.id,
      accountId: contact.accountId,
      address: contact.address,
      source: 'local-contact',
    });
    draft.localContactName = contact.name;
  }

  for (const contact of backendContacts) {
    const draft = ensureDraft({
      id: contact.id,
      accountId: contact.accountId,
      address: contact.address,
      source: 'backend-contact',
    });
    draft.backendContactName = contact.name;
    draft.chainId = contact.chainId;
    draft.fields = contact.fields;
  }

  return Array.from(byAccountId.values(), finalizeDraft);
}
