import { describe, expect, test } from 'vitest';

import { TransactionType } from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';

import {
  type OperationsFilterContext,
  filterOperation,
  getFilterableTxType,
  matchesAccount,
  matchesDateRange,
  matchesNetwork,
  matchesProxyType,
  matchesSearch,
  matchesTab,
  matchesTxType,
} from './operations-filter';

const MOCK_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
const MOCK_ACCOUNT_ID = '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY' as never;

const createMockOperation = (overrides?: Partial<MultisigOperation>): MultisigOperation =>
  ({
    id: 'op-1',
    status: 'pending',
    chainId: MOCK_CHAIN_ID,
    multisigAccountId: MOCK_ACCOUNT_ID,
    depositor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as never,
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

const emptyContext: OperationsFilterContext = {
  filters: {
    account: [],
    network: [],
    type: [],
    proxyType: [],
    searchQuery: '',
  },
  tab: 'pending',
  hiddenIds: [],
  multisigAccountsMap: {},
  walletNameByAccountId: {},
  chains: {},
};

describe('operations-filter', () => {
  describe('getFilterableTxType', () => {
    test('returns UNKNOWN_TYPE when operation has no transaction', () => {
      const op = createMockOperation({ transaction: null });
      expect(getFilterableTxType(op)).toBe('UNKNOWN_TYPE');
    });

    test('returns UNKNOWN_TYPE when transaction has no type', () => {
      const op = createMockOperation({
        transaction: { type: undefined, section: '', method: '', args: {} } as never,
      });
      expect(getFilterableTxType(op)).toBe('UNKNOWN_TYPE');
    });

    test('returns TRANSFER for transfer transaction type', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: {},
        } as never,
      });
      expect(getFilterableTxType(op)).toBe(TransactionType.TRANSFER);
    });

    test('returns XCM_LIMITED_TRANSFER for XCM transaction type', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.XCM_LIMITED_TRANSFER,
          section: 'xcmPallet',
          method: 'limitedReserveTransferAssets',
          args: {},
        } as never,
      });
      expect(getFilterableTxType(op)).toBe(TransactionType.XCM_LIMITED_TRANSFER);
    });

    test('returns inner type for BATCH_ALL with transfer inside', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.BATCH_ALL,
          section: 'utility',
          method: 'batchAll',
          args: {
            transactions: [
              {
                type: TransactionType.TRANSFER,
                section: 'balances',
                method: 'transfer',
                args: {},
              },
            ],
          },
        } as never,
      });
      expect(getFilterableTxType(op)).toBe(TransactionType.TRANSFER);
    });
  });

  describe('matchesTab', () => {
    test('hidden: returns true when operation is in hiddenIds', () => {
      const op = createMockOperation({ id: 'op-hidden' });
      expect(matchesTab(op, 'hidden', ['op-hidden'])).toBe(true);
    });

    test('hidden: returns false when operation is not in hiddenIds', () => {
      const op = createMockOperation({ id: 'op-visible' });
      expect(matchesTab(op, 'hidden', ['other-id'])).toBe(false);
    });

    test('pending: returns true when not hidden and status is pending', () => {
      const op = createMockOperation({ id: 'op-1', status: 'pending' });
      expect(matchesTab(op, 'pending', [])).toBe(true);
    });

    test('pending: returns false when hidden', () => {
      const op = createMockOperation({ id: 'op-1', status: 'pending' });
      expect(matchesTab(op, 'pending', ['op-1'])).toBe(false);
    });

    test('pending: returns false when not hidden but status is executed', () => {
      expect(matchesTab(createMockOperation({ status: 'executed' }), 'pending', [])).toBe(false);
    });

    test('history: returns true when not hidden and status is executed', () => {
      expect(matchesTab(createMockOperation({ status: 'executed' }), 'history', [])).toBe(true);
    });

    test('history: returns true when not hidden and status is cancelled', () => {
      expect(matchesTab(createMockOperation({ status: 'cancelled' }), 'history', [])).toBe(true);
    });

    test('history: returns true when not hidden and status is error', () => {
      expect(matchesTab(createMockOperation({ status: 'error' }), 'history', [])).toBe(true);
    });

    test('history: returns false when hidden', () => {
      const op = createMockOperation({ id: 'op-1', status: 'executed' });
      expect(matchesTab(op, 'history', ['op-1'])).toBe(false);
    });

    test('history: returns false when not hidden but status is pending', () => {
      expect(matchesTab(createMockOperation({ status: 'pending' }), 'history', [])).toBe(false);
    });
  });

  describe('matchesAccount', () => {
    test('returns true when account list is empty', () => {
      const op = createMockOperation();
      expect(matchesAccount(op, [])).toBe(true);
    });

    test('returns true when operation accountId is in list', () => {
      const op = createMockOperation();
      expect(matchesAccount(op, [MOCK_ACCOUNT_ID, '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as never])).toBe(
        true,
      );
    });

    test('returns false when operation accountId is not in list', () => {
      const op = createMockOperation({ multisigAccountId: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as never });
      expect(matchesAccount(op, [MOCK_ACCOUNT_ID])).toBe(false);
    });
  });

  describe('matchesNetwork', () => {
    const otherChainId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';

    test('returns true when network list is empty', () => {
      const op = createMockOperation();
      expect(matchesNetwork(op, [])).toBe(true);
    });

    test('returns true when chainId is in list', () => {
      const op = createMockOperation();
      expect(matchesNetwork(op, [MOCK_CHAIN_ID])).toBe(true);
    });

    test('returns true when XCM destination is in list', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.XCM_LIMITED_TRANSFER,
          section: 'xcmPallet',
          method: 'limitedReserveTransferAssets',
          args: { destinationChain: otherChainId },
        } as never,
      });
      expect(matchesNetwork(op, [otherChainId])).toBe(true);
    });

    test('returns false when neither chainId nor destination is in list', () => {
      const op = createMockOperation();
      expect(
        matchesNetwork(op, [otherChainId, '0xfc41b9bd8ef8fe64d6c44a895e4471ef95163b1f5e2f0e0e0e0e0e0e0e0e0e0e0']),
      ).toBe(false);
    });
  });

  describe('matchesTxType', () => {
    test('returns true when type list is empty', () => {
      const op = createMockOperation();
      expect(matchesTxType(op, [])).toBe(true);
    });

    test('returns true when operation type is in list', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transfer',
          args: {},
        } as never,
      });
      expect(matchesTxType(op, [TransactionType.TRANSFER])).toBe(true);
    });

    test('returns false when operation type is not in list', () => {
      const op = createMockOperation({
        transaction: {
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transfer',
          args: {},
        } as never,
      });
      expect(matchesTxType(op, [TransactionType.BOND])).toBe(false);
    });
  });

  describe('matchesProxyType', () => {
    test('returns true when proxyType list is empty', () => {
      const op = createMockOperation();
      expect(matchesProxyType(op, [], {})).toBe(true);
    });

    test('returns false when account not in map and proxyType filter is set', () => {
      const op = createMockOperation();
      expect(matchesProxyType(op, ['Any'], {})).toBe(false);
    });
  });

  describe('matchesDateRange', () => {
    test('returns true when dateRange is undefined', () => {
      const op = createMockOperation({ timestamp: new Date('2024-01-15').getTime() });
      expect(matchesDateRange(op, undefined)).toBe(true);
    });

    test('returns true when dateRange has no from or to', () => {
      const op = createMockOperation({ timestamp: new Date('2024-01-15').getTime() });
      expect(matchesDateRange(op, { from: undefined, to: undefined })).toBe(true);
    });

    test('returns true when operation date is within from-to range', () => {
      const op = createMockOperation({
        timestamp: new Date('2024-01-15T12:00:00').getTime(),
      });
      expect(
        matchesDateRange(op, {
          from: new Date('2024-01-14'),
          to: new Date('2024-01-16'),
        }),
      ).toBe(true);
    });

    test('returns false when operation date is before range', () => {
      const op = createMockOperation({
        timestamp: new Date('2024-01-10').getTime(),
      });
      expect(
        matchesDateRange(op, {
          from: new Date('2024-01-14'),
          to: new Date('2024-01-16'),
        }),
      ).toBe(false);
    });

    test('returns true when operation date is on or after from (no to)', () => {
      const op = createMockOperation({
        timestamp: new Date('2024-01-15').getTime(),
      });
      expect(matchesDateRange(op, { from: new Date('2024-01-14') })).toBe(true);
    });

    test('interprets UTC-midnight range as local calendar day (Jan 25 includes same-day UTC noon)', () => {
      const opOnJan25 = createMockOperation({
        timestamp: new Date('2025-01-25T12:00:00Z').getTime(),
      });
      expect(
        matchesDateRange(opOnJan25, {
          from: new Date('2025-01-25'),
          to: new Date('2025-01-25'),
        }),
      ).toBe(true);
    });

    test('interprets UTC-midnight range as local calendar day (Jan 25 excludes previous day UTC)', () => {
      const opOnJan24 = createMockOperation({
        timestamp: new Date('2025-01-24T23:00:00Z').getTime(),
      });
      expect(
        matchesDateRange(opOnJan24, {
          from: new Date('2025-01-25'),
          to: new Date('2025-01-25'),
        }),
      ).toBe(false);
    });
  });

  describe('matchesSearch', () => {
    test('returns true when searchQuery is empty or undefined', () => {
      const op = createMockOperation();
      expect(matchesSearch(op, undefined, {}, {}, {})).toBe(true);
      expect(matchesSearch(op, '', {}, {}, {})).toBe(true);
      expect(matchesSearch(op, '   ', {}, {}, {})).toBe(true);
    });

    test('returns true when wallet name contains query', () => {
      const op = createMockOperation();
      expect(matchesSearch(op, 'MyWallet', { [MOCK_ACCOUNT_ID]: 'MyWallet Name' }, {}, {})).toBe(true);
    });

    test('returns true when callHash contains query', () => {
      const op = createMockOperation({ callHash: '0xabc123def' });
      expect(matchesSearch(op, 'abc123', {}, {}, {})).toBe(true);
    });

    test('returns false when no field matches query', () => {
      const op = createMockOperation({ callHash: '0xaaa' });
      expect(matchesSearch(op, 'nomatch', { [MOCK_ACCOUNT_ID]: 'Wallet' }, {}, {})).toBe(false);
    });
  });

  describe('filterOperation', () => {
    test('returns true when all filters are empty and tab is pending', () => {
      const op = createMockOperation({ status: 'pending' });
      expect(filterOperation(op, emptyContext)).toBe(true);
    });

    test('returns false when tab is pending but operation is hidden', () => {
      const op = createMockOperation({ id: 'op-1', status: 'pending' });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        hiddenIds: ['op-1'],
      };
      expect(filterOperation(op, ctx)).toBe(false);
    });

    test('returns false when tab is pending but operation status is executed', () => {
      const op = createMockOperation({ status: 'executed' });
      expect(filterOperation(op, emptyContext)).toBe(false);
    });

    test('returns false when account filter excludes operation', () => {
      const op = createMockOperation({ multisigAccountId: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as never });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        filters: { ...emptyContext.filters, account: [MOCK_ACCOUNT_ID] },
      };
      expect(filterOperation(op, ctx)).toBe(false);
    });

    test('returns true when all predicates pass', () => {
      const op = createMockOperation({
        id: 'op-1',
        status: 'pending',
        callHash: '0xmatch',
      });
      const ctx: OperationsFilterContext = {
        ...emptyContext,
        filters: {
          ...emptyContext.filters,
          account: [MOCK_ACCOUNT_ID],
          network: [MOCK_CHAIN_ID],
          searchQuery: 'match',
        },
      };
      expect(filterOperation(op, ctx)).toBe(true);
    });
  });
});
