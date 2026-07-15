import { describe, expect, test } from 'vitest';

import { type Chain, type ChainId } from '@/shared/core';
import { type Draft } from '@/domains/backend';

import { type DraftListScope, filterDraftsByScope } from './draft-scope';

const POLKADOT_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;
const KUSAMA_CHAIN_ID = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe' as ChainId;

// Alice's well-known accountId — resolves to a valid address for any prefix.
const MOCK_ACCOUNT_ID = '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d' as never;

const chains = {
  [POLKADOT_CHAIN_ID]: { chainId: POLKADOT_CHAIN_ID, name: 'Polkadot', addressPrefix: 0, assets: [] } as never as Chain,
  [KUSAMA_CHAIN_ID]: { chainId: KUSAMA_CHAIN_ID, name: 'Kusama', addressPrefix: 2, assets: [] } as never as Chain,
};

const createMockDraft = (overrides?: Partial<Draft>): Draft =>
  ({
    id: 'draft-1',
    multisigAccountId: MOCK_ACCOUNT_ID,
    proxyAccountId: null,
    chainId: POLKADOT_CHAIN_ID,
    callData: null,
    description: 'Pay the team',
    createdBy: 'user-1',
    createdAt: '2024-06-15T12:00:00Z',
    updatedAt: '2024-06-15T12:00:00Z',
    signingPath: [],
    initiatorAccountId: null,
    ...overrides,
  }) as Draft;

const emptyScope: DraftListScope = {
  network: [],
  type: [],
  proxyType: [],
  dateRange: undefined,
  searchQuery: '',
};

describe('filterDraftsByScope', () => {
  const polkadotDraft = createMockDraft({ id: 'draft-dot', chainId: POLKADOT_CHAIN_ID });
  const kusamaDraft = createMockDraft({ id: 'draft-ksm', chainId: KUSAMA_CHAIN_ID });

  test('keeps every draft for an empty scope', () => {
    const result = filterDraftsByScope([polkadotDraft, kusamaDraft], emptyScope, chains);
    expect(result.map((d) => d.id)).toEqual(['draft-dot', 'draft-ksm']);
  });

  test('network filter keeps only drafts on the selected chains', () => {
    const scope = { ...emptyScope, network: [KUSAMA_CHAIN_ID] };
    const result = filterDraftsByScope([polkadotDraft, kusamaDraft], scope, chains);
    expect(result.map((d) => d.id)).toEqual(['draft-ksm']);
  });

  test('an active type filter puts every draft out of scope', () => {
    const scope = { ...emptyScope, type: ['transfer'] };
    expect(filterDraftsByScope([polkadotDraft, kusamaDraft], scope, chains)).toEqual([]);
  });

  test('an active proxy type filter puts every draft out of scope', () => {
    const scope = { ...emptyScope, proxyType: ['Any'] };
    expect(filterDraftsByScope([polkadotDraft, kusamaDraft], scope, chains)).toEqual([]);
  });

  test('date range filters by creation date', () => {
    const juneDraft = createMockDraft({ id: 'draft-june', createdAt: '2024-06-15T12:00:00Z' });
    const januaryDraft = createMockDraft({ id: 'draft-jan', createdAt: '2024-01-10T12:00:00Z' });

    const fromScope = { ...emptyScope, dateRange: { from: new Date('2024-03-01') } };
    expect(filterDraftsByScope([juneDraft, januaryDraft], fromScope, chains).map((d) => d.id)).toEqual(['draft-june']);

    const rangeScope = { ...emptyScope, dateRange: { from: new Date('2024-01-01'), to: new Date('2024-02-01') } };
    expect(filterDraftsByScope([juneDraft, januaryDraft], rangeScope, chains).map((d) => d.id)).toEqual(['draft-jan']);
  });

  test('search matches the description case-insensitively', () => {
    const scope = { ...emptyScope, searchQuery: 'PAY the' };
    expect(filterDraftsByScope([polkadotDraft], scope, chains).map((d) => d.id)).toEqual(['draft-dot']);

    const missScope = { ...emptyScope, searchQuery: 'unrelated' };
    expect(filterDraftsByScope([polkadotDraft], missScope, chains)).toEqual([]);
  });

  test('search matches the multisig address formatted with the chain prefix', () => {
    // Alice's accountId on Polkadot (prefix 0) starts with 15oF4...
    const scope = { ...emptyScope, searchQuery: '15oF4' };
    expect(filterDraftsByScope([polkadotDraft], scope, chains).map((d) => d.id)).toEqual(['draft-dot']);
  });
});
