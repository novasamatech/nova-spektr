import { describe, expect, it } from 'vitest';

import { type Address, type ContactField, WalletType } from '@/shared/core';
import {
  applyPresetFilter,
  buildMergedEntries,
  matchPreset,
  migratePreset,
  migrateStoredPresets,
  normalizePresetFilters,
} from '../lib';
import { type AccountEntry, type AccountPreset, type PresetFilterCriteria } from '../types';

const entityField = (values: { optionId: string; value: string }[]): ContactField => ({
  fieldId: 'f-entity',
  fieldName: 'Entity',
  multiSelect: true,
  values,
});

const typeField = (optionId: string, value: string): ContactField => ({
  fieldId: 'f-type',
  fieldName: 'Contact Type',
  multiSelect: false,
  values: [{ optionId, value }],
});

const wallet: AccountEntry = {
  id: 'w1',
  name: 'Main Wallet',
  address: '0x1' as Address,
  accountId: '0x1',
  aliases: ['Main Wallet'],
  sources: ['wallet'],
  walletId: 1,
  walletName: 'Main Wallet',
  walletType: WalletType.POLKADOT_VAULT,
};

const localContact: AccountEntry = {
  id: 'lc1',
  name: 'Alice Local',
  address: '0x2' as Address,
  accountId: '0x2',
  aliases: ['Alice Local'],
  sources: ['local-contact'],
};

const backendContact: AccountEntry = {
  id: 'bc1',
  name: 'Bob Backend',
  address: '0x3' as Address,
  accountId: '0x3',
  aliases: ['Bob Backend'],
  sources: ['backend-contact'],
  chainId: '0xdot',
  fields: [
    entityField([
      { optionId: 'fo-parity', value: 'Parity' },
      { optionId: 'fo-w3f', value: 'W3F' },
    ]),
    typeField('fo-multisig', 'Multisig'),
  ],
};

const backendContact2: AccountEntry = {
  id: 'bc2',
  name: 'Charlie Backend',
  address: '0x4' as Address,
  accountId: '0x4',
  aliases: ['Charlie Backend'],
  sources: ['backend-contact'],
  chainId: '0xksm',
  fields: [entityField([{ optionId: 'fo-w3f', value: 'W3F' }]), typeField('fo-wallet', 'Wallet')],
};

// Known to both a wallet and the external address book.
const walletAndBackend: AccountEntry = {
  id: 'w-x',
  name: 'Treasury',
  address: '0xX' as Address,
  accountId: '0xX',
  aliases: ['MS-1', 'Treasury'],
  sources: ['wallet', 'backend-contact'],
  walletId: 9,
  walletName: 'MS-1',
  walletType: WalletType.MULTISIG,
  chainId: '0xdot',
  fields: [entityField([{ optionId: 'fo-treasury', value: 'Treasury Co' }])],
};

const entries = [wallet, localContact, backendContact, backendContact2, walletAndBackend];
const empty: PresetFilterCriteria = { sources: [], chainIds: [], fields: [] };

const entityCriterion = (options: { id: string; value: string }[]) => ({
  fieldId: 'f-entity',
  fieldName: 'Entity',
  options,
});

const typeCriterion = (options: { id: string; value: string }[]) => ({
  fieldId: 'f-type',
  fieldName: 'Contact Type',
  options,
});

describe('applyPresetFilter', () => {
  it('returns all entries when all filters are empty', () => {
    expect(applyPresetFilter(empty, entries)).toEqual(entries);
  });

  it('filters by source membership', () => {
    expect(applyPresetFilter({ ...empty, sources: ['wallet'] }, entries)).toEqual([wallet, walletAndBackend]);
  });

  it('source: backend-contact includes entries that are also wallets', () => {
    expect(applyPresetFilter({ ...empty, sources: ['backend-contact'] }, entries)).toEqual([
      backendContact,
      backendContact2,
      walletAndBackend,
    ]);
  });

  it('filters by multiple source types (OR)', () => {
    expect(applyPresetFilter({ ...empty, sources: ['wallet', 'backend-contact'] }, entries)).toEqual([
      wallet,
      backendContact,
      backendContact2,
      walletAndBackend,
    ]);
  });

  it('filters by field option id', () => {
    const filters = { ...empty, fields: [entityCriterion([{ id: 'fo-parity', value: 'Parity' }])] };
    expect(applyPresetFilter(filters, entries)).toEqual([backendContact]);
  });

  it('field criterion matches any selected option (OR within a field)', () => {
    const filters = { ...empty, fields: [entityCriterion([{ id: 'fo-w3f', value: 'W3F' }])] };
    expect(applyPresetFilter(filters, entries)).toEqual([backendContact, backendContact2]);
  });

  it('field criteria combine with AND across fields', () => {
    const filters = {
      ...empty,
      fields: [
        entityCriterion([{ id: 'fo-w3f', value: 'W3F' }]),
        typeCriterion([{ id: 'fo-wallet', value: 'Wallet' }]),
      ],
    };
    expect(applyPresetFilter(filters, entries)).toEqual([backendContact2]);
  });

  it('entries without backend-contact source are excluded when field filters are active', () => {
    const filters = { ...empty, fields: [entityCriterion([{ id: 'fo-parity', value: 'Parity' }])] };
    const result = applyPresetFilter(filters, entries);
    expect(result.some(e => !e.sources.includes('backend-contact'))).toBe(false);
  });

  it('entries lacking the criterion field entirely do not match', () => {
    const filters = { ...empty, fields: [typeCriterion([{ id: 'fo-multisig', value: 'Multisig' }])] };
    expect(applyPresetFilter(filters, entries)).toEqual([backendContact]);
  });

  it('a criterion over a removed field matches nothing', () => {
    const filters = {
      ...empty,
      fields: [{ fieldId: 'f-gone', fieldName: 'Removed', options: [{ id: 'fo-gone', value: 'Gone' }] }],
    };
    expect(applyPresetFilter(filters, entries)).toEqual([]);
  });

  it('a criterion with no selected options constrains nothing', () => {
    const filters = { ...empty, fields: [entityCriterion([])] };
    expect(applyPresetFilter(filters, entries)).toEqual(entries);
  });

  it('filters by chainId', () => {
    expect(applyPresetFilter({ ...empty, chainIds: ['0xdot'] }, entries)).toEqual([backendContact, walletAndBackend]);
  });

  it('chain filter matches any of the listed chains (OR)', () => {
    expect(applyPresetFilter({ ...empty, chainIds: ['0xdot', '0xksm'] }, entries)).toEqual([
      backendContact,
      backendContact2,
      walletAndBackend,
    ]);
  });

  it('chain filter excludes entries without backend-contact source', () => {
    const result = applyPresetFilter({ ...empty, chainIds: ['0xdot'] }, entries);
    expect(result.some(e => !e.sources.includes('backend-contact'))).toBe(false);
  });

  it('combines source + field (AND across dimensions)', () => {
    const filters = {
      ...empty,
      sources: ['backend-contact' as const],
      fields: [entityCriterion([{ id: 'fo-w3f', value: 'W3F' }])],
    };
    expect(applyPresetFilter(filters, entries)).toEqual([backendContact, backendContact2]);
  });

  it('tolerates criteria objects that still carry retired name-keyed lists', () => {
    const legacy = {
      sources: ['local-contact' as const],
      entityNames: ['W3F'],
      categoryNames: [],
      contactTypeNames: [],
      tags: [],
    } as unknown as PresetFilterCriteria;
    expect(applyPresetFilter(legacy, entries)).toEqual([localContact]);
  });

  it('returns empty array when nothing matches', () => {
    const filters = {
      ...empty,
      sources: ['local-contact' as const],
      fields: [entityCriterion([{ id: 'fo-parity', value: 'Parity' }])],
    };
    expect(applyPresetFilter(filters, entries)).toEqual([]);
  });
});

describe('normalizePresetFilters', () => {
  it('fills fields missing from legacy persisted criteria and drops retired keys', () => {
    const legacy = { sources: [], entityNames: ['W3F'], categoryNames: [], tags: [] };
    expect(normalizePresetFilters(legacy)).toEqual({ sources: [], chainIds: [], fields: [] });
  });

  it('keeps complete criteria intact', () => {
    const full: PresetFilterCriteria = {
      sources: ['wallet'],
      chainIds: ['0xdot'],
      fields: [entityCriterion([{ id: 'fo-w3f', value: 'W3F' }])],
    };
    expect(normalizePresetFilters(full)).toEqual(full);
  });
});

const legacyFilters = (overrides: object): PresetFilterCriteria =>
  ({ sources: [], entityNames: ['W3F'], categoryNames: [], tags: [], ...overrides }) as unknown as PresetFilterCriteria;

describe('migratePreset', () => {
  const base: AccountPreset = { id: 'p1', name: 'W3F', type: 'filter', filters: empty, selectedIds: [] };

  it('flags a filter preset whose only criteria were saved under retired keys', () => {
    expect(migratePreset({ ...base, filters: legacyFilters({}) })).toEqual({
      ...base,
      filters: empty,
      needsReview: true,
    });
  });

  it('keeps surviving criteria and drops retired ones without flagging', () => {
    const filters = legacyFilters({ sources: ['wallet'] });
    expect(migratePreset({ ...base, filters })).toEqual({ ...base, filters: { ...empty, sources: ['wallet'] } });
  });

  it('does not flag when retired keys are present but empty', () => {
    expect(migratePreset({ ...base, filters: legacyFilters({ entityNames: [] }) })).toEqual({
      ...base,
      filters: empty,
    });
  });

  it('leaves a modern preset unchanged', () => {
    const modern: AccountPreset = {
      ...base,
      filters: {
        sources: ['wallet'],
        chainIds: ['0xdot'],
        fields: [entityCriterion([{ id: 'fo-w3f', value: 'W3F' }])],
      },
    };
    expect(migratePreset(modern)).toEqual(modern);
  });

  it('never flags custom presets', () => {
    const custom: AccountPreset = { ...base, type: 'custom', filters: legacyFilters({}), selectedIds: ['w1'] };
    expect(migratePreset(custom)).toEqual({ ...custom, filters: empty });
  });

  it('is idempotent — the flag survives a second run over the normalized shape', () => {
    const once = migratePreset({ ...base, filters: legacyFilters({}) });
    expect(migratePreset(once)).toEqual(once);
  });
});

describe('migrateStoredPresets', () => {
  it('migrates the raw localStorage payload', () => {
    const raw = JSON.stringify([
      { id: 'p1', name: 'W3F', type: 'filter', filters: { sources: [], entityNames: ['W3F'] }, selectedIds: [] },
      { id: 'p2', name: 'Mixed', type: 'filter', filters: { sources: ['wallet'], tags: ['x'] }, selectedIds: [] },
    ]);
    expect(JSON.parse(migrateStoredPresets(raw)!)).toEqual([
      { id: 'p1', name: 'W3F', type: 'filter', filters: empty, selectedIds: [], needsReview: true },
      { id: 'p2', name: 'Mixed', type: 'filter', filters: { ...empty, sources: ['wallet'] }, selectedIds: [] },
    ]);
  });

  it('returns null for payloads that are not a preset list', () => {
    expect(migrateStoredPresets('{"broken":')).toBeNull();
    expect(migrateStoredPresets('{"id":"x"}')).toBeNull();
    expect(migrateStoredPresets('[{"name":"no id"}]')).toBeNull();
  });
});

describe('matchPreset', () => {
  const preset = (overrides: Partial<AccountPreset>): AccountPreset => ({
    id: 'p1',
    name: 'Test',
    type: 'filter',
    filters: empty,
    selectedIds: [],
    ...overrides,
  });

  it('a preset flagged for review matches nothing instead of everything', () => {
    expect(matchPreset(preset({ needsReview: true }), entries)).toEqual([]);
  });

  it('returns all entries when preset is null (no scoping)', () => {
    expect(matchPreset(null, entries)).toEqual(entries);
  });

  it('type=filter applies the filter criteria', () => {
    expect(matchPreset(preset({ filters: { ...empty, sources: ['local-contact'] } }), entries)).toEqual([localContact]);
  });

  it('type=custom uses selectedIds intersection', () => {
    expect(matchPreset(preset({ type: 'custom', selectedIds: ['w1', 'bc2'] }), entries)).toEqual([
      wallet,
      backendContact2,
    ]);
  });

  it('type=custom with empty selectedIds matches nothing', () => {
    expect(matchPreset(preset({ type: 'custom', selectedIds: [] }), entries)).toEqual([]);
  });

  it('type=custom ignores filter criteria entirely', () => {
    const p = preset({
      type: 'custom',
      selectedIds: ['lc1'],
      filters: { ...empty, sources: ['wallet'] },
    });
    expect(matchPreset(p, entries)).toEqual([localContact]);
  });
});

describe('buildMergedEntries', () => {
  it('produces one entry per accountId when all three sources overlap', () => {
    const result = buildMergedEntries({
      walletSeeds: [
        {
          id: 'w-id',
          name: 'My Wallet',
          address: '0xA' as Address,
          accountId: '0xA',
          walletId: 1,
          walletName: 'My Wallet',
          walletType: WalletType.POLKADOT_VAULT,
        },
      ],
      localContacts: [{ id: 'lc-id', name: 'Local Alice', address: '0xA' as Address, accountId: '0xA' }],
      backendContacts: [
        {
          id: 'bc-id',
          name: 'External Alice',
          address: '0xA' as Address,
          accountId: '0xA',
          chainId: null,
          fields: [entityField([{ optionId: 'fo-co', value: 'Co' }])],
        },
      ],
    });

    expect(result).toHaveLength(1);
    const entry = result[0]!;
    expect(entry.id).toBe('w-id');
    expect(entry.sources).toEqual(['wallet', 'local-contact', 'backend-contact']);
    expect(entry.aliases).toEqual(['My Wallet', 'Local Alice', 'External Alice']);
    expect(entry.fields).toEqual([entityField([{ optionId: 'fo-co', value: 'Co' }])]);
  });

  it('uses backend-contact name when wallet is indexed (multisig/proxied)', () => {
    const result = buildMergedEntries({
      walletSeeds: [
        {
          id: 'ms-id',
          name: 'MS-1',
          address: '0xB' as Address,
          accountId: '0xB',
          walletId: 2,
          walletName: 'MS-1',
          walletType: WalletType.MULTISIG,
        },
      ],
      localContacts: [],
      backendContacts: [
        {
          id: 'bc-id',
          name: 'Treasury Multisig',
          address: '0xB' as Address,
          accountId: '0xB',
          chainId: null,
          fields: [],
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Treasury Multisig');
    expect(result[0]!.aliases).toEqual(['MS-1', 'Treasury Multisig']);
    expect(result[0]!.sources).toEqual(['wallet', 'backend-contact']);
  });

  it('prefers user-chosen wallet name over contact name for non-indexed wallets', () => {
    const result = buildMergedEntries({
      walletSeeds: [
        {
          id: 'w-id',
          name: "Alice's Vault",
          address: '0xC' as Address,
          accountId: '0xC',
          walletId: 3,
          walletName: "Alice's Vault",
          walletType: WalletType.POLKADOT_VAULT,
        },
      ],
      localContacts: [],
      backendContacts: [
        {
          id: 'bc-id',
          name: 'Alice External',
          address: '0xC' as Address,
          accountId: '0xC',
          chainId: null,
          fields: [],
        },
      ],
    });

    expect(result[0]!.name).toBe("Alice's Vault");
    expect(result[0]!.aliases).toContain("Alice's Vault");
    expect(result[0]!.aliases).toContain('Alice External');
  });

  it('falls back through local then wallet when backend is absent', () => {
    const result = buildMergedEntries({
      walletSeeds: [],
      localContacts: [{ id: 'lc-id', name: 'Local Only', address: '0xD' as Address, accountId: '0xD' }],
      backendContacts: [],
    });

    expect(result[0]!.name).toBe('Local Only');
    expect(result[0]!.sources).toEqual(['local-contact']);
  });

  it('deduplicates aliases case-insensitively', () => {
    const result = buildMergedEntries({
      walletSeeds: [],
      localContacts: [{ id: 'lc-id', name: 'Treasury', address: '0xE' as Address, accountId: '0xE' }],
      backendContacts: [
        {
          id: 'bc-id',
          name: 'treasury',
          address: '0xE' as Address,
          accountId: '0xE',
          chainId: null,
          fields: [],
        },
      ],
    });

    expect(result[0]!.aliases).toEqual(['Treasury']);
  });

  it('threads chain and field metadata onto backend-sourced entries', () => {
    const result = buildMergedEntries({
      walletSeeds: [],
      localContacts: [],
      backendContacts: [
        {
          id: 'bc-id',
          name: 'Typed Contact',
          address: '0xG' as Address,
          accountId: '0xG',
          chainId: '0xdot',
          fields: [typeField('fo-multisig', 'Multisig')],
        },
      ],
    });

    expect(result[0]!.chainId).toBe('0xdot');
    expect(result[0]!.fields).toEqual([typeField('fo-multisig', 'Multisig')]);
  });

  it('preserves wallet-first id when both wallet and contact share an accountId', () => {
    const result = buildMergedEntries({
      walletSeeds: [
        {
          id: 'w-id',
          name: 'W',
          address: '0xF' as Address,
          accountId: '0xF',
          walletId: 4,
          walletName: 'W',
          walletType: WalletType.POLKADOT_VAULT,
        },
      ],
      localContacts: [{ id: 'lc-id', name: 'C', address: '0xF' as Address, accountId: '0xF' }],
      backendContacts: [],
    });

    expect(result[0]!.id).toBe('w-id');
  });
});
