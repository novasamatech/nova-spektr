import { describe, expect, test } from 'vitest';

import { type Asset, type AssetId, type Chain, type ChainId, AssetType, TransactionType } from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';

import { type SortContext, getNextSortState, sortOperations } from './operations-sort';
import { type OperationWithAccount } from './types';

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

const nativeAsset = {
  assetId: 0 as AssetId,
  name: 'Polkadot',
  symbol: 'DOT',
  precision: 10,
  icon: { monochrome: '', colored: '' },
  type: AssetType.NATIVE,
} as Asset;

const usdtAsset = {
  assetId: 1 as AssetId,
  name: 'Tether USD',
  symbol: 'USDT',
  precision: 6,
  icon: { monochrome: '', colored: '' },
  type: AssetType.STATEMINE,
  typeExtras: { assetId: '1984' },
} as Asset;

const mockChain = {
  chainId: MOCK_CHAIN_ID,
  name: 'Polkadot',
  assets: [nativeAsset, usdtAsset],
  nodes: [],
  addressPrefix: 0,
  specName: 'polkadot',
  icon: '',
} as Chain;

const context: SortContext = {
  chains: { [MOCK_CHAIN_ID]: mockChain },
  multisigWallets: [{ id: 1, name: 'MyWallet' }],
};

const createTransferItem = (id: string, value: string): OperationWithAccount => ({
  operation: createMockOperation({
    id,
    transaction: {
      type: TransactionType.TRANSFER,
      section: 'balances',
      method: 'transferKeepAlive',
      args: { value },
    } as never,
  }),
  account: mockAccount,
});

describe('operations-sort', () => {
  describe('getNextSortState', () => {
    test('sets asc when no current sort', () => {
      expect(getNextSortState(null, 'type')).toEqual({ by: 'type', direction: 'asc' });
    });

    test('switches asc to desc for same column', () => {
      expect(getNextSortState({ by: 'type', direction: 'asc' }, 'type')).toEqual({ by: 'type', direction: 'desc' });
    });

    test('clears sort from desc for same column', () => {
      expect(getNextSortState({ by: 'type', direction: 'desc' }, 'type')).toBeNull();
    });

    test('resets to asc when switching column', () => {
      expect(getNextSortState({ by: 'type', direction: 'desc' }, 'value')).toEqual({ by: 'value', direction: 'asc' });
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
    // 1 DOT at precision 10
    const oneUnitOp = createTransferItem('op-one', '10000000000');
    // 5 DOT at precision 10
    const fiveUnitsOp = createTransferItem('op-five', '50000000000');
    // 100 USDT at precision 6 — smaller raw value than 1 DOT, but a larger asset amount
    const usdtOp: OperationWithAccount = {
      operation: createMockOperation({
        id: 'op-usdt',
        transaction: {
          type: TransactionType.ASSET_TRANSFER,
          section: 'assets',
          method: 'transferKeepAlive',
          args: { assetId: '1984', value: '100000000' },
        } as never,
      }),
      account: mockAccount,
    };

    const items = [fiveUnitsOp, usdtOp, noAmountOp, oneUnitOp];

    test('defaults to newest-first by timestamp when sort is null', () => {
      const oldOp: OperationWithAccount = {
        operation: createMockOperation({ id: 'op-old', timestamp: new Date('2024-01-01').getTime() }),
        account: mockAccount,
      };
      const newOp: OperationWithAccount = {
        operation: createMockOperation({ id: 'op-new', timestamp: new Date('2024-03-01').getTime() }),
        account: mockAccount,
      };
      const midOp: OperationWithAccount = {
        operation: createMockOperation({ id: 'op-mid', timestamp: new Date('2024-02-01').getTime() }),
        account: mockAccount,
      };

      const input = [oldOp, newOp, midOp];
      const result = sortOperations(input, null, context);

      expect(result.map(i => i.operation.id)).toEqual(['op-new', 'op-mid', 'op-old']);
      // input must not be mutated
      expect(input.map(i => i.operation.id)).toEqual(['op-old', 'op-new', 'op-mid']);
    });

    test('breaks equal-timestamp ties by block and index, newest first', () => {
      const timestamp = new Date('2024-01-15').getTime();
      const earlyBlock: OperationWithAccount = {
        operation: createMockOperation({ id: 'op-block-100', timestamp, blockCreated: 100 as never, indexCreated: 1 }),
        account: mockAccount,
      };
      const lateBlock: OperationWithAccount = {
        operation: createMockOperation({ id: 'op-block-200', timestamp, blockCreated: 200 as never, indexCreated: 1 }),
        account: mockAccount,
      };
      const lateIndex: OperationWithAccount = {
        operation: createMockOperation({ id: 'op-index-5', timestamp, blockCreated: 100 as never, indexCreated: 5 }),
        account: mockAccount,
      };

      const result = sortOperations([earlyBlock, lateIndex, lateBlock], null, context);

      expect(result.map(i => i.operation.id)).toEqual(['op-block-200', 'op-index-5', 'op-block-100']);
    });

    test('value asc orders no-amount, then 1 DOT, then 5 DOT, then 100 USDT', () => {
      const result = sortOperations(items, { by: 'value', direction: 'asc' }, context);
      expect(result.map(i => i.operation.id)).toEqual(['op-remark', 'op-one', 'op-five', 'op-usdt']);
    });

    test('value desc reverses the order', () => {
      const result = sortOperations(items, { by: 'value', direction: 'desc' }, context);
      expect(result.map(i => i.operation.id)).toEqual(['op-usdt', 'op-five', 'op-one', 'op-remark']);
    });

    test('value sort tiers: displayed amounts, then hidden values, then no value', () => {
      const delegateOp: OperationWithAccount = {
        operation: createMockOperation({
          id: 'op-delegate',
          transaction: {
            type: TransactionType.DELEGATE,
            section: 'convictionVoting',
            method: 'delegate',
            args: { balance: '999990000000000' },
          } as never,
        }),
        account: mockAccount,
      };
      const batchOp: OperationWithAccount = {
        operation: createMockOperation({
          id: 'op-batch',
          transaction: {
            type: TransactionType.BATCH_ALL,
            section: 'utility',
            method: 'batchAll',
            args: { transactions: [{ type: TransactionType.TRANSFER, args: { value: '10000000000' } }] },
          } as never,
        }),
        account: mockAccount,
      };

      const input = [delegateOp, noAmountOp, oneUnitOp, batchOp, fiveUnitsOp];

      const desc = sortOperations(input, { by: 'value', direction: 'desc' }, context);
      // Delegate carries a huge hidden balance but the Value column shows nothing —
      // it must stay in the middle tier, not outrank displayed transfer amounts.
      expect(desc.map(i => i.operation.id)).toEqual(['op-five', 'op-one', 'op-delegate', 'op-batch', 'op-remark']);

      const asc = sortOperations(input, { by: 'value', direction: 'asc' }, context);
      expect(asc.map(i => i.operation.id)).toEqual(['op-remark', 'op-delegate', 'op-batch', 'op-one', 'op-five']);
    });

    test('value asc treats non-numeric amount as no amount', () => {
      const brokenOp = createTransferItem('op-broken', 'not-a-number');
      const result = sortOperations([oneUnitOp, brokenOp], { by: 'value', direction: 'asc' }, context);
      expect(result.map(i => i.operation.id)).toEqual(['op-broken', 'op-one']);
    });

    test('type asc orders remark, transfer, unknown', () => {
      const unknownOp: OperationWithAccount = {
        operation: createMockOperation({ id: 'op-unknown', transaction: null }),
        account: mockAccount,
      };
      const result = sortOperations([unknownOp, oneUnitOp, noAmountOp], { by: 'type', direction: 'asc' }, context);
      expect(result.map(i => i.operation.id)).toEqual(['op-remark', 'op-one', 'op-unknown']);
    });

    test('submitter asc orders by wallet name with accountId fallback for missing wallet', () => {
      const alphaOp: OperationWithAccount = {
        operation: createMockOperation({ id: 'op-alpha' }),
        account: { accountId: MOCK_ACCOUNT_ID, accountType: 'multisig', walletId: 1 } as never,
      };
      const betaOp: OperationWithAccount = {
        operation: createMockOperation({ id: 'op-beta' }),
        account: { accountId: MOCK_ACCOUNT_ID, accountType: 'multisig', walletId: 2 } as never,
      };
      const noWalletOp: OperationWithAccount = {
        operation: createMockOperation({ id: 'op-no-wallet' }),
        account: { accountId: MOCK_ACCOUNT_ID, accountType: 'multisig', walletId: 99 } as never,
      };
      const submitterContext: SortContext = {
        chains: context.chains,
        multisigWallets: [
          { id: 1, name: 'Alpha' },
          { id: 2, name: 'beta' },
        ],
      };

      const result = sortOperations(
        [betaOp, noWalletOp, alphaOp],
        { by: 'submitter', direction: 'asc' },
        submitterContext,
      );
      // fallback key '5gnj...' sorts before letter-led wallet names
      expect(result.map(i => i.operation.id)).toEqual(['op-no-wallet', 'op-alpha', 'op-beta']);
    });

    test('keeps input order for equal keys', () => {
      const firstTransfer = createTransferItem('op-first', '10000000000');
      const secondTransfer = createTransferItem('op-second', '20000000000');
      const result = sortOperations([firstTransfer, secondTransfer], { by: 'type', direction: 'asc' }, context);
      expect(result.map(i => i.operation.id)).toEqual(['op-first', 'op-second']);
    });
  });
});
