import { describe, expect, it } from 'vitest';

import { type Address, WalletType } from '@/shared/core';
import { applyPresetFilter, buildMergedEntries, matchPreset, normalizePresetFilters } from '../lib';
import { type AccountEntry, type AccountPreset, type PresetFilterCriteria } from '../types';

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
  entityNames: ['Parity', 'W3F'],
  categoryName: 'Treasury',
  tags: [{ tagName: 'team', values: ['core', 'infra'] }],
  chainId: '0xdot',
  chainName: 'Polkadot',
  contactTypeName: 'Multisig',
};

const backendContact2: AccountEntry = {
  id: 'bc2',
  name: 'Charlie Backend',
  address: '0x4' as Address,
  accountId: '0x4',
  aliases: ['Charlie Backend'],
  sources: ['backend-contact'],
  entityNames: ['W3F'],
  categoryName: 'Grants',
  tags: [{ tagName: 'team', values: ['research'] }],
  chainId: '0xksm',
  chainName: 'Kusama',
  contactTypeName: 'Wallet',
};

// Same address as `wallet` (`0x1`) but also labeled in the external address book.
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
  entityNames: ['Treasury Co'],
  categoryName: 'Treasury',
  tags: [],
  chainId: '0xdot',
  chainName: 'Polkadot',
  contactTypeName: null,
};

const entries = [wallet, localContact, backendContact, backendContact2, walletAndBackend];
const empty: PresetFilterCriteria = {
  sources: [],
  entityNames: [],
  categoryNames: [],
  tags: [],
  chainIds: [],
  contactTypeNames: [],
};

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

  it('filters by entity name', () => {
    expect(applyPresetFilter({ ...empty, entityNames: ['Parity'] }, entries)).toEqual([backendContact]);
  });

  it('entity filter matches any of the contact entityNames (OR)', () => {
    expect(applyPresetFilter({ ...empty, entityNames: ['W3F'] }, entries)).toEqual([backendContact, backendContact2]);
  });

  it('filters by category name', () => {
    expect(applyPresetFilter({ ...empty, categoryNames: ['Treasury'] }, entries)).toEqual([
      backendContact,
      walletAndBackend,
    ]);
  });

  it('filters by tags (AND across tag names, OR within values)', () => {
    expect(applyPresetFilter({ ...empty, tags: [{ tagName: 'team', values: ['core'] }] }, entries)).toEqual([
      backendContact,
    ]);
  });

  it('entries without backend-contact source are excluded when entity/category/tag filters are active', () => {
    const result = applyPresetFilter({ ...empty, entityNames: ['Parity'] }, entries);
    expect(result.some(e => !e.sources.includes('backend-contact'))).toBe(false);
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

  it('filters by contact type name', () => {
    expect(applyPresetFilter({ ...empty, contactTypeNames: ['Multisig'] }, entries)).toEqual([backendContact]);
  });

  it('contact type filter excludes backend contacts without a type', () => {
    expect(applyPresetFilter({ ...empty, contactTypeNames: ['Multisig', 'Wallet'] }, entries)).toEqual([
      backendContact,
      backendContact2,
    ]);
  });

  it('combines chain + contact type (AND across dimensions)', () => {
    expect(applyPresetFilter({ ...empty, chainIds: ['0xdot'], contactTypeNames: ['Wallet'] }, entries)).toEqual([]);
  });

  it('accepts legacy criteria objects without the newer fields', () => {
    const legacy = {
      sources: [],
      entityNames: ['W3F'],
      categoryNames: [],
      tags: [],
    } as unknown as PresetFilterCriteria;
    expect(applyPresetFilter(legacy, entries)).toEqual([backendContact, backendContact2]);
  });

  it('combines source + entity (AND across dimensions)', () => {
    expect(applyPresetFilter({ ...empty, sources: ['backend-contact'], entityNames: ['W3F'] }, entries)).toEqual([
      backendContact,
      backendContact2,
    ]);
  });

  it('returns empty array when nothing matches', () => {
    expect(applyPresetFilter({ ...empty, sources: ['local-contact'], entityNames: ['NonExistent'] }, entries)).toEqual(
      [],
    );
  });
});

describe('normalizePresetFilters', () => {
  it('fills fields missing from legacy persisted criteria', () => {
    const legacy = { sources: [], entityNames: ['W3F'], categoryNames: [], tags: [] };
    expect(normalizePresetFilters(legacy)).toEqual({ ...legacy, chainIds: [], contactTypeNames: [] });
  });

  it('keeps complete criteria intact', () => {
    const full: PresetFilterCriteria = { ...empty, chainIds: ['0xdot'], contactTypeNames: ['Wallet'] };
    expect(normalizePresetFilters(full)).toEqual(full);
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
          entityNames: ['Co'],
          categoryName: null,
          tags: [],
          chainId: null,
          chainName: null,
          contactTypeName: null,
        },
      ],
    });

    expect(result).toHaveLength(1);
    const entry = result[0]!;
    expect(entry.id).toBe('w-id');
    expect(entry.sources).toEqual(['wallet', 'local-contact', 'backend-contact']);
    expect(entry.aliases).toEqual(['My Wallet', 'Local Alice', 'External Alice']);
    expect(entry.entityNames).toEqual(['Co']);
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
          entityNames: [],
          categoryName: null,
          tags: [],
          chainId: null,
          chainName: null,
          contactTypeName: null,
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
          entityNames: [],
          categoryName: null,
          tags: [],
          chainId: null,
          chainName: null,
          contactTypeName: null,
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
          entityNames: [],
          categoryName: null,
          tags: [],
          chainId: null,
          chainName: null,
          contactTypeName: null,
        },
      ],
    });

    expect(result[0]!.aliases).toEqual(['Treasury']);
  });

  it('threads chain and contact type metadata onto backend-sourced entries', () => {
    const result = buildMergedEntries({
      walletSeeds: [],
      localContacts: [],
      backendContacts: [
        {
          id: 'bc-id',
          name: 'Typed Contact',
          address: '0xG' as Address,
          accountId: '0xG',
          entityNames: [],
          categoryName: null,
          tags: [],
          chainId: '0xdot',
          chainName: 'Polkadot',
          contactTypeName: 'Multisig',
        },
      ],
    });

    expect(result[0]!.chainId).toBe('0xdot');
    expect(result[0]!.chainName).toBe('Polkadot');
    expect(result[0]!.contactTypeName).toBe('Multisig');
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
