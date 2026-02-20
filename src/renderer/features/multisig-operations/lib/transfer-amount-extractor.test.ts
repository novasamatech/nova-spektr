import { describe, expect, test } from 'vitest';

import {
  type AssetId,
  type Chain,
  type ChainId,
  type DecodedTransaction,
  AssetType,
  TransactionType,
} from '@/shared/core';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation } from '@/domains/network';

import { extractTransferAmount, extractTransferAmounts, hasTransferAmount } from './transfer-amount-extractor';

/**
 * Helper to create a mock decoded transaction for testing. In tests, we don't
 * need chainId and accountId as they're not used by the extractor logic.
 */
const mockDecodedTransaction = (tx: {
  type: TransactionType;
  section: string;
  method: string;
  args: Record<string, unknown>;
}): DecodedTransaction => tx as unknown as DecodedTransaction;

describe('transfer-amount-extractor', () => {
  const createMockChain = (overrides?: Partial<Chain>): Chain => ({
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId,
    name: 'Polkadot',
    assets: [
      {
        assetId: 0 as AssetId,
        name: 'Polkadot',
        symbol: 'DOT',
        precision: 10,
        icon: { monochrome: '', colored: '' },
        type: AssetType.NATIVE,
      },
    ],
    nodes: [],
    addressPrefix: 0,
    specName: 'polkadot',
    icon: '',
    ...overrides,
  });

  const createMockOperation = (overrides?: Partial<MultisigOperation>): MultisigOperation => ({
    id: 'op-1',
    status: 'pending',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId,
    multisigAccountId: '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY' as never,
    depositor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as never,
    callHash: '0xabc123' as never,
    callData: '0xdef456' as never,
    method: 'transfer',
    section: 'balances',
    blockCreated: 100 as BlockHeight,
    indexCreated: 1,
    timestamp: 1705334400000,
    events: [],
    transaction: null,
    ...overrides,
  });

  describe('hasTransferAmount', () => {
    test('should return false for operation without transaction', () => {
      const operation = createMockOperation({ transaction: null });

      expect(hasTransferAmount(operation)).toBe(false);
    });

    test('should return true for transfer transaction', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: {
            dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            value: '10000000000',
          },
        }),
      });

      expect(hasTransferAmount(operation)).toBe(true);
    });

    test('should return true for XCM transaction', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.XCM_LIMITED_TRANSFER,
          section: 'xcmPallet',
          method: 'limitedReserveTransferAssets',
          args: {
            dest: {},
            beneficiary: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            value: '10000000000',
          },
        }),
      });

      expect(hasTransferAmount(operation)).toBe(true);
    });

    test('should return true for bond transaction', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.BOND,
          section: 'staking',
          method: 'bond',
          args: {
            value: '10000000000',
            payee: 'Staked',
          },
        }),
      });

      expect(hasTransferAmount(operation)).toBe(true);
    });

    test('should return true for delegate transaction', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.DELEGATE,
          section: 'convictionVoting',
          method: 'delegate',
          args: {
            target: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            conviction: 'Locked1x',
            balance: '10000000000',
          },
        }),
      });

      expect(hasTransferAmount(operation)).toBe(true);
    });

    test('should return false for add_proxy transaction', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.ADD_PROXY,
          section: 'proxy',
          method: 'addProxy',
          args: {
            delegate: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            proxyType: 'Any',
            delay: 0,
          },
        }),
      });

      expect(hasTransferAmount(operation)).toBe(false);
    });

    test('should return true for batch_all with transfer', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.BATCH_ALL,
          section: 'utility',
          method: 'batchAll',
          args: {
            transactions: [
              {
                type: TransactionType.TRANSFER,
                section: 'balances',
                method: 'transferKeepAlive',
                args: { dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', value: '10000000000' },
              },
            ],
          },
        }),
      });

      expect(hasTransferAmount(operation)).toBe(true);
    });

    test('should handle proxy-wrapped transfer', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.PROXY,
          section: 'proxy',
          method: 'proxy',
          args: {
            real: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            transaction: {
              type: TransactionType.TRANSFER,
              section: 'balances',
              method: 'transferKeepAlive',
              args: {
                dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
                value: '10000000000',
              },
            },
          },
        }),
      });

      expect(hasTransferAmount(operation)).toBe(true);
    });
  });

  describe('extractTransferAmount', () => {
    test('should return null for operation without transaction', () => {
      const operation = createMockOperation({ transaction: null });
      const chain = createMockChain();

      expect(extractTransferAmount(operation, chain)).toBeNull();
    });

    test('should return null for non-transfer transaction', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.ADD_PROXY,
          section: 'proxy',
          method: 'addProxy',
          args: {
            delegate: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            proxyType: 'Any',
            delay: 0,
          },
        }),
      });
      const chain = createMockChain();

      expect(extractTransferAmount(operation, chain)).toBeNull();
    });

    test('should extract transfer amount correctly', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: {
            dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            value: '10000000000', // 1 DOT with 10 decimals
          },
        }),
      });
      const chain = createMockChain();

      const result = extractTransferAmount(operation, chain);

      expect(result).not.toBeNull();
      expect(result?.rawAmount).toBe('10000000000');
      expect(result?.formattedAmount).toBe('1');
      expect(result?.assetSymbol).toBe('DOT');
      expect(result?.assetPrecision).toBe(10);
      expect(result?.displayAmount).toBe('1 DOT');
    });

    test('should extract fractional amount correctly', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: {
            dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            value: '15500000000', // 1.55 DOT
          },
        }),
      });
      const chain = createMockChain();

      const result = extractTransferAmount(operation, chain);

      expect(result).not.toBeNull();
      expect(result?.rawAmount).toBe('15500000000');
      expect(result?.formattedAmount).toBe('1.55');
      expect(result?.displayAmount).toBe('1.55 DOT');
    });

    test('should extract recipient from transfer', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: {
            dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            value: '10000000000',
          },
        }),
      });
      const chain = createMockChain();

      const result = extractTransferAmount(operation, chain);

      expect(result?.recipient).toBe('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');
      // Recipient address is encoded with chain's address prefix (0 for Polkadot)
      expect(result?.recipientAddress).toBeDefined();
      expect(result?.recipientAddress).toMatch(/^1[a-zA-Z0-9]{47}$/); // Polkadot addresses start with 1
    });

    test('should extract bond amount from staking transaction', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.BOND,
          section: 'staking',
          method: 'bond',
          args: {
            value: '50000000000', // 5 DOT
            payee: 'Staked',
          },
        }),
      });
      const chain = createMockChain();

      const result = extractTransferAmount(operation, chain);

      expect(result).not.toBeNull();
      expect(result?.rawAmount).toBe('50000000000');
      expect(result?.formattedAmount).toBe('5');
      expect(result?.assetSymbol).toBe('DOT');
      expect(result?.recipient).toBeNull(); // Bond doesn't have a recipient
    });

    test('should extract delegate balance from governance transaction', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.DELEGATE,
          section: 'convictionVoting',
          method: 'delegate',
          args: {
            target: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            conviction: 'Locked1x',
            balance: '100000000000', // 10 DOT
          },
        }),
      });
      const chain = createMockChain();

      const result = extractTransferAmount(operation, chain);

      expect(result).not.toBeNull();
      expect(result?.rawAmount).toBe('100000000000');
      expect(result?.formattedAmount).toBe('10');
    });

    test('should handle null chain gracefully', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: {
            dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            value: '10000000000',
          },
        }),
      });

      expect(extractTransferAmount(operation, null)).toBeNull();
    });

    test('should handle chain without assets gracefully', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: {
            dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            value: '10000000000',
          },
        }),
      });
      const chain = createMockChain({ assets: [] });

      expect(extractTransferAmount(operation, chain)).toBeNull();
    });

    test('should handle proxy-wrapped transfer', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.PROXY,
          section: 'proxy',
          method: 'proxy',
          args: {
            real: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            transaction: {
              type: TransactionType.TRANSFER,
              section: 'balances',
              method: 'transferKeepAlive',
              args: {
                dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
                value: '25000000000', // 2.5 DOT
              },
            },
          },
        }),
      });
      const chain = createMockChain();

      const result = extractTransferAmount(operation, chain);

      expect(result).not.toBeNull();
      expect(result?.rawAmount).toBe('25000000000');
      expect(result?.formattedAmount).toBe('2.5');
    });

    test('should handle batch_all with staking operations', () => {
      const operation = createMockOperation({
        transaction: mockDecodedTransaction({
          type: TransactionType.BATCH_ALL,
          section: 'utility',
          method: 'batchAll',
          args: {
            transactions: [
              {
                type: TransactionType.BOND,
                section: 'staking',
                method: 'bond',
                args: { value: '50000000000', payee: 'Staked' },
              },
              {
                type: TransactionType.NOMINATE,
                section: 'staking',
                method: 'nominate',
                args: { targets: [] },
              },
            ],
          },
        }),
      });
      const chain = createMockChain();

      const result = extractTransferAmount(operation, chain);

      expect(result).not.toBeNull();
      expect(result?.rawAmount).toBe('50000000000');
      expect(result?.formattedAmount).toBe('5');
    });

    test('should use different asset precisions correctly', () => {
      // Kusama has 12 decimals
      const kusamaChain = createMockChain({
        chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe' as ChainId,
        name: 'Kusama',
        assets: [
          {
            assetId: 0 as AssetId,
            name: 'Kusama',
            symbol: 'KSM',
            precision: 12,
            icon: { monochrome: '', colored: '' },
            type: AssetType.NATIVE,
          },
        ],
      });

      const operation = createMockOperation({
        chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe' as ChainId,
        transaction: mockDecodedTransaction({
          type: TransactionType.TRANSFER,
          section: 'balances',
          method: 'transferKeepAlive',
          args: {
            dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            value: '1500000000000', // 1.5 KSM with 12 decimals
          },
        }),
      });

      const result = extractTransferAmount(operation, kusamaChain);

      expect(result).not.toBeNull();
      expect(result?.rawAmount).toBe('1500000000000');
      expect(result?.formattedAmount).toBe('1.5');
      expect(result?.assetSymbol).toBe('KSM');
      expect(result?.assetPrecision).toBe(12);
      expect(result?.displayAmount).toBe('1.5 KSM');
    });
  });

  describe('extractTransferAmounts', () => {
    test('should process multiple operations', () => {
      const chain = createMockChain();
      const operations = [
        createMockOperation({
          id: 'op-1',
          transaction: mockDecodedTransaction({
            type: TransactionType.TRANSFER,
            section: 'balances',
            method: 'transferKeepAlive',
            args: { dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', value: '10000000000' },
          }),
        }),
        createMockOperation({
          id: 'op-2',
          transaction: mockDecodedTransaction({
            type: TransactionType.ADD_PROXY,
            section: 'proxy',
            method: 'addProxy',
            args: { delegate: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', proxyType: 'Any', delay: 0 },
          }),
        }),
        createMockOperation({
          id: 'op-3',
          transaction: mockDecodedTransaction({
            type: TransactionType.BOND,
            section: 'staking',
            method: 'bond',
            args: { value: '50000000000', payee: 'Staked' },
          }),
        }),
      ];

      const results = extractTransferAmounts(operations, {
        [chain.chainId]: chain,
      } as Record<string, Chain>);

      expect(results.size).toBe(3);
      expect(results.get('op-1')?.formattedAmount).toBe('1');
      expect(results.get('op-2')).toBeNull();
      expect(results.get('op-3')?.formattedAmount).toBe('5');
    });

    test('should handle missing chain for some operations', () => {
      const polkadotChain = createMockChain();
      const operations = [
        createMockOperation({
          id: 'op-1',
          chainId: polkadotChain.chainId,
          transaction: mockDecodedTransaction({
            type: TransactionType.TRANSFER,
            section: 'balances',
            method: 'transferKeepAlive',
            args: { dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', value: '10000000000' },
          }),
        }),
        createMockOperation({
          id: 'op-2',
          chainId: '0xunknown' as ChainId,
          transaction: mockDecodedTransaction({
            type: TransactionType.TRANSFER,
            section: 'balances',
            method: 'transferKeepAlive',
            args: { dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', value: '10000000000' },
          }),
        }),
      ];

      const results = extractTransferAmounts(operations, {
        [polkadotChain.chainId]: polkadotChain,
      } as Record<string, Chain>);

      expect(results.get('op-1')?.formattedAmount).toBe('1');
      expect(results.get('op-2')).toBeNull(); // No chain found
    });
  });
});
