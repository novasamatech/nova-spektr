import { describe, expect, it } from 'vitest';

import { type Address } from '@/shared/core';
import { type PresetFilterCriteria } from '@/aggregates/dashboard-presets';
import { type DashboardEntry, applyPresetFilter } from '../dashboard-model';

const wallet: DashboardEntry = {
  id: 'w1',
  name: 'Main Wallet',
  address: '0x1' as Address,
  accountId: '0x1',
  source: 'wallet',
};

const localContact: DashboardEntry = {
  id: 'lc1',
  name: 'Alice Local',
  address: '0x2' as Address,
  accountId: '0x2',
  source: 'local-contact',
};

const backendContact: DashboardEntry = {
  id: 'bc1',
  name: 'Bob Backend',
  address: '0x3' as Address,
  accountId: '0x3',
  source: 'backend-contact',
  entityNames: ['Parity', 'W3F'],
  categoryName: 'Treasury',
  tags: [{ tagName: 'team', values: ['core', 'infra'] }],
};

const backendContact2: DashboardEntry = {
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
    const result = applyPresetFilter({ ...empty, sources: ['wallet'] }, entries);
    expect(result).toEqual([wallet]);
  });

  it('filters by multiple source types (OR)', () => {
    const result = applyPresetFilter({ ...empty, sources: ['wallet', 'backend-contact'] }, entries);
    expect(result).toEqual([wallet, backendContact, backendContact2]);
  });

  it('filters by entity name', () => {
    const result = applyPresetFilter({ ...empty, entityNames: ['Parity'] }, entries);
    expect(result).toEqual([backendContact]);
  });

  it('entity filter matches any of the contact entityNames (OR)', () => {
    const result = applyPresetFilter({ ...empty, entityNames: ['W3F'] }, entries);
    expect(result).toEqual([backendContact, backendContact2]);
  });

  it('filters by category name', () => {
    const result = applyPresetFilter({ ...empty, categoryNames: ['Treasury'] }, entries);
    expect(result).toEqual([backendContact]);
  });

  it('filters by tags (AND across tag names, OR within values)', () => {
    const result = applyPresetFilter({ ...empty, tags: [{ tagName: 'team', values: ['core'] }] }, entries);
    expect(result).toEqual([backendContact]);
  });

  it('non-backend entries excluded when entity/category/tag filters are active', () => {
    const result = applyPresetFilter({ ...empty, entityNames: ['Parity'] }, entries);
    expect(result.find((e) => e.source === 'wallet')).toBeUndefined();
    expect(result.find((e) => e.source === 'local-contact')).toBeUndefined();
  });

  it('combines source + entity (AND across dimensions)', () => {
    const result = applyPresetFilter({ ...empty, sources: ['backend-contact'], entityNames: ['W3F'] }, entries);
    expect(result).toEqual([backendContact, backendContact2]);
  });

  it('returns empty array when nothing matches', () => {
    const result = applyPresetFilter({ ...empty, sources: ['local-contact'], entityNames: ['NonExistent'] }, entries);
    expect(result).toEqual([]);
  });
});
