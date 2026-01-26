import { describe, expect, test } from 'vitest';

import { type AssetId, type Chain, type ChainId } from '@/shared/core';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type MultisigEvent, type MultisigOperation } from '@/domains/network';

import {
  createCsvBlob,
  formatTimestampISO,
  generateCsv,
  generateExportFilename,
  serializeOperationToCsvRow,
} from './csv-export';

describe('csv-export', () => {
  describe('formatTimestampISO', () => {
    test('should format timestamp to ISO 8601', () => {
      const timestamp = 1705334400000; // 2024-01-15T16:00:00.000Z
      const result = formatTimestampISO(timestamp);

      expect(result).toBe('2024-01-15T16:00:00.000Z');
    });
  });

  describe('generateExportFilename', () => {
    test('should generate filename with count and tab', () => {
      const result = generateExportFilename(10, 'pending');

      expect(result).toMatch(/^multisig-operations-pending-\d{4}-\d{2}-\d{2}-10-items\.csv$/);
    });
  });

  describe('createCsvBlob', () => {
    test('should create a blob with correct type', () => {
      const blob = createCsvBlob('test,data');

      expect(blob.type).toBe('text/csv;charset=utf-8');
    });
  });

  describe('serializeOperationToCsvRow', () => {
    const mockChain: Chain = {
      chainId: '0x123' as ChainId,
      name: 'Test Chain',
      assets: [
        {
          assetId: 0 as AssetId,
          name: 'Test Token',
          symbol: 'TST',
          precision: 10,
          icon: { monochrome: '', colored: '' },
          type: 0 as never,
        },
      ],
      nodes: [],
      addressPrefix: 0,
      specName: 'test',
      icon: '',
    };

    const mockEvent: MultisigEvent = {
      id: 'event-1',
      accountId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as never,
      status: 'approve',
      blockCreated: 100 as BlockHeight,
      indexCreated: 1,
      timestamp: 1705334400000,
    };

    const mockOperation: MultisigOperation = {
      id: 'op-1',
      status: 'pending',
      chainId: '0x123' as ChainId,
      accountId: '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY' as never,
      depositor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as never,
      callHash: '0xabc123' as never,
      callData: '0xdef456' as never,
      method: 'transfer',
      section: 'balances',
      blockCreated: 100 as BlockHeight,
      indexCreated: 1,
      timestamp: 1705334400000,
      events: [mockEvent],
      transaction: null,
    };

    test('should serialize operation to CSV row', () => {
      const context = { chains: { '0x123': mockChain } as Record<ChainId, Chain> };
      const row = serializeOperationToCsvRow(mockOperation, context);

      expect(row.status).toBe('pending');
      expect(row.chain_name).toBe('Test Chain');
      expect(row.method).toBe('transfer');
      expect(row.section).toBe('balances');
      expect(row.call_hash).toBe('0xabc123');
      expect(row.call_data).toBe('0xdef456');
      expect(row.approvals_count).toBe('1');
      expect(row.rejections_count).toBe('0');
    });

    test('should handle missing chain gracefully', () => {
      const context = { chains: {} as Record<ChainId, Chain> };
      const row = serializeOperationToCsvRow(mockOperation, context);

      expect(row.chain_name).toBe('');
    });
  });

  describe('generateCsv', () => {
    const mockChain: Chain = {
      chainId: '0x123' as ChainId,
      name: 'Test Chain',
      assets: [
        {
          assetId: 0 as AssetId,
          name: 'Test Token',
          symbol: 'TST',
          precision: 10,
          icon: { monochrome: '', colored: '' },
          type: 0 as never,
        },
      ],
      nodes: [],
      addressPrefix: 0,
      specName: 'test',
      icon: '',
    };

    const mockOperation: MultisigOperation = {
      id: 'op-1',
      status: 'pending',
      chainId: '0x123' as ChainId,
      accountId: '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY' as never,
      depositor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as never,
      callHash: '0xabc123' as never,
      callData: null,
      method: 'transfer',
      section: 'balances',
      blockCreated: 100 as BlockHeight,
      indexCreated: 1,
      timestamp: 1705334400000,
      events: [],
      transaction: null,
    };

    test('should generate CSV with BOM and headers', () => {
      const context = { chains: { '0x123': mockChain } as Record<ChainId, Chain> };
      const csv = generateCsv([mockOperation], context);

      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain('timestamp,explorer_url,status,chain_name');
      expect(csv).toContain('Test Chain');
    });

    test('should escape values with commas', () => {
      const operationWithComma = {
        ...mockOperation,
        method: 'transfer,all',
      };
      const context = { chains: { '0x123': mockChain } as Record<ChainId, Chain> };
      const csv = generateCsv([operationWithComma], context);

      expect(csv).toContain('"transfer,all"');
    });

    test('should escape values with quotes', () => {
      const operationWithQuote = {
        ...mockOperation,
        method: 'transfer"special',
      };
      const context = { chains: { '0x123': mockChain } as Record<ChainId, Chain> };
      const csv = generateCsv([operationWithQuote], context);

      expect(csv).toContain('"transfer""special"');
    });
  });
});
