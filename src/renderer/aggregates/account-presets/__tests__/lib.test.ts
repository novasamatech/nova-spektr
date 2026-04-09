import { describe, expect, it } from 'vitest';

import { type Address } from '@/shared/core';
import { applyPresetFilter, matchPreset } from '../lib';
import { type AccountEntry, type AccountPreset, type PresetFilterCriteria } from '../types';

const wallet: AccountEntry = {
  id: 'w1',
  name: 'Main Wallet',
  address: '0x1' as Address,
  accountId: '0x1',
  source: 'wallet',
  walletId: 1,
};

const localContact: AccountEntry = {
  id: 'lc1',
  name: 'Alice Local',
  address: '0x2' as Address,
  accountId: '0x2',
  source: 'local-contact',
};

const backendContact: AccountEntry = {
  id: 'bc1',
  name: 'Bob Backend',
  address: '0x3' as Address,
  accountId: '0x3',
  source: 'backend-contact',
  entityNames: ['Parity', 'W3F'],
  categoryName: 'Treasury',
  tags: [{ tagName: 'team', values: ['core', 'infra'] }],
};

const backendContact2: AccountEntry = {
  id: 'bc2',
  name: 'Charlie Backend',
  address: '0x4' as Address,
  accountId: '0x4',
  source: 'backend-contact',
  entityNames: ['W3F'],
  categoryName: 'Grants',
  tags: [{ tagName: 'team', values: ['research'] }],
};

const entries = [wallet, localContact, backendContact, backendContact2];
const empty: PresetFilterCriteria = { sources: [], entityNames: [], categoryNames: [], tags: [] };

describe('applyPresetFilter', () => {
  it('returns all entries when all filters are empty', () => {
    expect(applyPresetFilter(empty, entries)).toEqual(entries);
  });

  it('filters by source type', () => {
    expect(applyPresetFilter({ ...empty, sources: ['wallet'] }, entries)).toEqual([wallet]);
  });

  it('filters by multiple source types (OR)', () => {
    expect(applyPresetFilter({ ...empty, sources: ['wallet', 'backend-contact'] }, entries)).toEqual([
      wallet,
      backendContact,
      backendContact2,
    ]);
  });

  it('filters by entity name', () => {
    expect(applyPresetFilter({ ...empty, entityNames: ['Parity'] }, entries)).toEqual([backendContact]);
  });

  it('entity filter matches any of the contact entityNames (OR)', () => {
    expect(applyPresetFilter({ ...empty, entityNames: ['W3F'] }, entries)).toEqual([backendContact, backendContact2]);
  });

  it('filters by category name', () => {
    expect(applyPresetFilter({ ...empty, categoryNames: ['Treasury'] }, entries)).toEqual([backendContact]);
  });

  it('filters by tags (AND across tag names, OR within values)', () => {
    expect(applyPresetFilter({ ...empty, tags: [{ tagName: 'team', values: ['core'] }] }, entries)).toEqual([
      backendContact,
    ]);
  });

  it('non-backend entries excluded when entity/category/tag filters are active', () => {
    const result = applyPresetFilter({ ...empty, entityNames: ['Parity'] }, entries);
    expect(result.find(e => e.source === 'wallet')).toBeUndefined();
    expect(result.find(e => e.source === 'local-contact')).toBeUndefined();
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
    expect(matchPreset(preset({ filters: { ...empty, sources: ['wallet'] } }), entries)).toEqual([wallet]);
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
