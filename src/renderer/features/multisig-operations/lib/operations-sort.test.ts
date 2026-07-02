import { describe, expect, test } from 'vitest';

import { type Asset, type AssetId, type Chain, type ChainId, AssetType, TransactionType } from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';
import { type OperationWithAccount } from '../model/context';

import { type SortContext, getNextSortState, sortOperations } from './operations-sort';

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

    test('returns input order unchanged when sort is null', () => {
      const result = sortOperations(items, null, context);
      expect(result).toBe(items);
    });

    test('value asc orders no-amount, then 1 DOT, then 5 DOT, then 100 USDT', () => {
      const result = sortOperations(items, { by: 'value', direction: 'asc' }, context);
      expect(result.map(i => i.operation.id)).toEqual(['op-remark', 'op-one', 'op-five', 'op-usdt']);
    });

    test('value desc reverses the order', () => {
      const result = sortOperations(items, { by: 'value', direction: 'desc' }, context);
      expect(result.map(i => i.operation.id)).toEqual(['op-usdt', 'op-five', 'op-one', 'op-remark']);
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
