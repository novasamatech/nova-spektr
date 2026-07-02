import { describe, expect, test } from 'vitest';

import { type MultisigOperation } from '@/domains/network';

import { SECTION_LABEL_KEYS, SECTION_ORDER, getOperationSection, isOperationSection } from './operations-sections';

const MOCK_ACCOUNT_ID = '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY' as never;

const createMockOperation = (overrides?: Partial<MultisigOperation>): MultisigOperation =>
  ({
    id: 'op-1',
    status: 'pending',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    multisigAccountId: MOCK_ACCOUNT_ID,
    depositor: MOCK_ACCOUNT_ID,
    callHash: '0xabc123',
    callData: '0xdef',
    method: 'transfer',
    section: 'balances',
    blockCreated: 100,
    indexCreated: 1,
    timestamp: new Date('2024-01-15').getTime(),
    events: [],
    transaction: null,
    ...overrides,
  }) as MultisigOperation;

describe('operations-sections', () => {
  describe('getOperationSection', () => {
    test('returns in_progress for pending status', () => {
      expect(getOperationSection(createMockOperation({ status: 'pending' }))).toBe('in_progress');
    });

    test('returns completed for executed status', () => {
      expect(getOperationSection(createMockOperation({ status: 'executed' }))).toBe('completed');
    });

    test('returns rejected for cancelled status', () => {
      expect(getOperationSection(createMockOperation({ status: 'cancelled' }))).toBe('rejected');
    });

    test('returns rejected for error status', () => {
      expect(getOperationSection(createMockOperation({ status: 'error' }))).toBe('rejected');
    });
  });

  test('SECTION_ORDER is in_progress, completed, rejected', () => {
    expect(SECTION_ORDER).toEqual(['in_progress', 'completed', 'rejected']);
  });

  describe('isOperationSection', () => {
    test.each(SECTION_ORDER)('returns true for %s', section => {
      expect(isOperationSection(section)).toBe(true);
    });

    test('returns false for an arbitrary string', () => {
      expect(isOperationSection('not_a_section')).toBe(false);
    });
  });

  test('SECTION_LABEL_KEYS covers exactly SECTION_ORDER', () => {
    expect(Object.keys(SECTION_LABEL_KEYS).sort()).toEqual([...SECTION_ORDER].sort());
  });
});
