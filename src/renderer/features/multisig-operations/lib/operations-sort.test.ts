import { describe, expect, test } from 'vitest';

import { type Asset, type Chain, type ChainId, TransactionType } from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';
import { type OperationWithAccount } from '../model/context';

import { type SortContext, nextSortState, sortOperations } from './operations-sort';

const MOCK_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;
const MOCK_ACCOUNT_ID = '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY' as never;

const createMockOperation = (overrides?: Partial<MultisigOperation>): MultisigOperation =>
  ({
    id: 'op-1',
    status: 'pending',
    chainId: MOCK_CHAIN_ID,
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

const mockAccount = { accountId: MOCK_ACCOUNT_ID, accountType: 'multisig', walletId: 1 } as never;

const mockChain = {
  chainId: MOCK_CHAIN_ID,
  assets: [{ precision: 12 } as Asset],
} as Chain;

const context: SortContext = {
  chains: { [MOCK_CHAIN_ID]: mockChain },
  multisigWallets: [{ id: 1, name: 'MyWallet' }],
};

describe('operations-sort', () => {
  describe('nextSortState', () => {
    test('sets asc when no current sort', () => {
      expect(nextSortState(null, 'type')).toEqual({ by: 'type', direction: 'asc' });
    });

    test('switches asc to desc for same column', () => {
      expect(nextSortState({ by: 'type', direction: 'asc' }, 'type')).toEqual({ by: 'type', direction: 'desc' });
    });

    test('clears sort from desc for same column', () => {
      expect(nextSortState({ by: 'type', direction: 'desc' }, 'type')).toBeNull();
    });

    test('resets to asc when switching column', () => {
      expect(nextSortState({ by: 'type', direction: 'desc' }, 'value')).toEqual({ by: 'value', direction: 'asc' });
    });
  });

  describe('sortOperations', () => {
    const noAmountOp: OperationWithAccount = {
      operation: createMockOperation({
        id: 'op-remark',
        transaction: { type: TransactionType.REMARK, section: 'system', method: 'remark', args: {} } as never,
      }),
      account: mockAccount,
    };
    const oneUnitOp: OperationWithAccount = {
      operation: createMockOperation({
        id: 'op-one',
        transaction: {
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: { value: '1000000000000' },
        } as never,
      }),
      account: mockAccount,
    };
    const fiveUnitsOp: OperationWithAccount = {
      operation: createMockOperation({
        id: 'op-five',
        transaction: {
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: { value: '5000000000000' },
        } as never,
      }),
      account: mockAccount,
    };

    const items = [fiveUnitsOp, noAmountOp, oneUnitOp];

    test('returns input order unchanged when sort is null', () => {
      const result = sortOperations(items, null, context);
      expect(result).toBe(items);
    });

    test('value asc orders no-amount, then 1, then 5', () => {
      const result = sortOperations(items, { by: 'value', direction: 'asc' }, context);
      expect(result.map(i => i.operation.id)).toEqual(['op-remark', 'op-one', 'op-five']);
    });

    test('value desc reverses the order', () => {
      const result = sortOperations(items, { by: 'value', direction: 'desc' }, context);
      expect(result.map(i => i.operation.id)).toEqual(['op-five', 'op-one', 'op-remark']);
    });
  });
});
