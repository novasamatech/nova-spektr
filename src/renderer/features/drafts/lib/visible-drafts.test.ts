import { describe, expect, test } from 'vitest';

import { type ChainId } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type Draft } from '@/domains/backend';

import { filterVisibleDrafts } from './visible-drafts';

const POLKADOT_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;

// Alice's well-known accountId.
const MOCK_ACCOUNT_ID = toAccountId('0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d');

const createMockDraft = (overrides?: Partial<Draft>): Draft => ({
  id: 'draft-1',
  operation: null,
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
});

describe('filterVisibleDrafts', () => {
  test('should keep a draft with no linked operation', () => {
    const draft = createMockDraft({ id: 'pending-1' });

    expect(filterVisibleDrafts([draft])).toEqual([draft]);
  });

  test('should drop a draft once an operation links back to it', () => {
    const submitted = createMockDraft({ id: 'submitted-1', operation: { id: 'op-1' } });

    expect(filterVisibleDrafts([submitted])).toEqual([]);
  });

  test('should partition a mixed list', () => {
    const pending = createMockDraft({ id: 'pending-1' });
    const submitted = createMockDraft({ id: 'submitted-1', operation: { id: 'op-1' } });

    expect(filterVisibleDrafts([pending, submitted, createMockDraft({ id: 'pending-2' })])).toEqual([
      pending,
      createMockDraft({ id: 'pending-2' }),
    ]);
  });

  test('should return an empty list unchanged', () => {
    expect(filterVisibleDrafts([])).toEqual([]);
  });
});
