import { type Address, type ID, WalletType } from '@/shared/core';
import { type ContactTag } from '@/shared/core/types/contact';

import {
  type AccountEntry,
  type AccountPreset,
  type AccountSource,
  type PresetFilterCriteria,
  EMPTY_FILTERS,
} from './types';

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

/** Presets persisted before newer criteria fields were added may lack them. */
export const normalizePresetFilters = (filters: Partial<PresetFilterCriteria>): PresetFilterCriteria => ({
  ...EMPTY_FILTERS,
  ...filters,
});

export function applyPresetFilter(filters: PresetFilterCriteria, entries: AccountEntry[]): AccountEntry[] {
  const { sources, entityNames, categoryNames, tags, chainIds, contactTypeNames } = normalizePresetFilters(filters);
  const needsBackendMetadata =
    entityNames.length > 0 ||
    categoryNames.length > 0 ||
    tags.length > 0 ||
    chainIds.length > 0 ||
    contactTypeNames.length > 0;

  return entries.filter(entry => {
    if (sources.length > 0 && !sources.some(s => entry.sources.includes(s))) return false;

    if (!needsBackendMetadata) return true;
    if (!entry.sources.includes('backend-contact')) return false;

    // sources.includes('backend-contact') guarantees these are populated by buildMergedEntries.
    const entityList = entry.entityNames!;
    const tagList = entry.tags!;

    if (entityNames.length > 0 && !entityList.some(e => entityNames.includes(e))) return false;
    if (categoryNames.length > 0 && (entry.categoryName == null || !categoryNames.includes(entry.categoryName))) {
      return false;
    }
    if (chainIds.length > 0 && (entry.chainId == null || !chainIds.includes(entry.chainId))) return false;
    if (
      contactTypeNames.length > 0 &&
      (entry.contactTypeName == null || !contactTypeNames.includes(entry.contactTypeName))
    ) {
      return false;
    }
    if (
      tags.length > 0 &&
      !tags.every(t => tagList.some(et => et.tagName === t.tagName && t.values.some(v => et.values.includes(v))))
    ) {
      return false;
    }

    return true;
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
  entityNames: string[];
  categoryName: string | null;
  tags: ContactTag[];
  chainId: string | null;
  chainName: string | null;
  contactTypeName: string | null;
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
  entityNames?: string[];
  categoryName?: string | null;
  tags?: ContactTag[];
  chainId?: string | null;
  chainName?: string | null;
  contactTypeName?: string | null;
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
    entry.entityNames = draft.entityNames ?? [];
    entry.categoryName = draft.categoryName ?? null;
    entry.tags = draft.tags ?? [];
    entry.chainId = draft.chainId ?? null;
    entry.chainName = draft.chainName ?? null;
    entry.contactTypeName = draft.contactTypeName ?? null;
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
    draft.entityNames = contact.entityNames;
    draft.categoryName = contact.categoryName;
    draft.tags = contact.tags;
    draft.chainId = contact.chainId;
    draft.chainName = contact.chainName;
    draft.contactTypeName = contact.contactTypeName;
  }

  return Array.from(byAccountId.values(), finalizeDraft);
}
