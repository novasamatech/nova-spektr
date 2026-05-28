import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { type Call } from '@polkadot/types/interfaces';
import { describe, vi } from 'vitest';

import { type HexString } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { transactionService } from './service';
import { metadata } from './service.mocks';
import { type AnyDecodedTransaction, type DecodedTransaction, type EncodedTransaction } from './types';

type TransferDecodedTransaction = DecodedTransaction<{
  dest: AccountId;
  value: string;
}>;

const isTransferTransaction = (t: AnyDecodedTransaction): t is TransferDecodedTransaction => {
  return t.section === 'balances' && t.method === 'transferKeepAlive';
};

const createMockApi = async () => {
  const registry = new TypeRegistry();
  const provider = new MockProvider(registry);
  const firstBlockHash = await provider.send('chain_getBlockHash', []);
  const genesisHash = registry.createType('Hash', firstBlockHash).toHex();
  const specVersion = 0;
  return ApiPromise.create({
    metadata: { [`${genesisHash}-${specVersion}`]: metadata },
    provider,
    registry,
    throwOnConnect: true,
  });
};

const TEST_ADDRESS_1 = '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242';
const TEST_ADDRESS_2 = '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a243';
const TRANSFER_AMOUNT_1 = 1000;
const TRANSFER_AMOUNT_2 = 2000;

const createTransferExtrinsic = (api: ApiPromise, address: string, amount: number) => {
  return api.tx.balances.transferKeepAlive(address, amount);
};

describe('Transaction service', () => {
  afterEach(() => {
    transactionService.encodeTransactionTransformer.resetHandlers();
    transactionService.decodeTransactionTransformer.resetHandlers();
    transactionService.wrapTransactionTransformer.resetHandlers();
    transactionService.unwrapTransactionTransformer.resetHandlers();
  });

  it('should check Transaction types', async () => {
    const decoded: AnyDecodedTransaction = { type: 'decoded', section: 'test', method: '', args: {} };
    const encoded: EncodedTransaction = { type: 'encoded', callData: '0x00' };

    expect(transactionService.isDecodedTransaction(decoded)).toEqual(true);
    expect(transactionService.isDecodedTransaction(encoded)).toEqual(false);

    expect(transactionService.isEncodedTransaction(encoded)).toEqual(true);
    expect(transactionService.isEncodedTransaction(decoded)).toEqual(false);
  });

  describe('decoding', () => {
    it('should decode transaction', async () => {
      const api = await createMockApi();
      const encodedTransaction: EncodedTransaction = {
        type: 'encoded',
        callData: '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
      };
      const decodedTransaction: TransferDecodedTransaction = {
        type: 'decoded',
        section: 'balances',
        method: 'transferKeepAlive',
        args: {
          value: '1000000000000',
          dest: '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242' as AccountId,
        },
      };

      transactionService.decodeTransactionTransformer.registerHandler({
        available: () => true,
        body(extrinsic) {
          if (extrinsic.method.section === 'balances' && extrinsic.method.method === 'transferKeepAlive') {
            const dest = extrinsic.args[0]?.toHex();
            const value = extrinsic.args[1]?.toString();

            return {
              type: 'decoded',
              section: extrinsic.method.section,
              method: extrinsic.method.method,
              args: {
                dest,
                value,
              },
            };
          }
        },
      });

      const decodedTransfer = transactionService.decodeTransaction(encodedTransaction, api);
      expect(decodedTransfer).toEqual(decodedTransaction);
    });

    it('should throw error when no decoding handlers for given transaction found', async () => {
      const api = await createMockApi();
      const encodedTransfer: EncodedTransaction = {
        type: 'encoded',
        callData: '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
      };

      expect(() => transactionService.decodeTransaction(encodedTransfer, api)).toThrowErrorMatchingInlineSnapshot(
        `[Error: Can't decode extrinsic]`,
      );
    });
  });

  describe('encoding', () => {
    it('should encode transaction', async () => {
      const api = await createMockApi();
      const decodedTransaction: TransferDecodedTransaction = {
        type: 'decoded',
        section: 'balances',
        method: 'transferKeepAlive',
        args: {
          value: '1000000000000',
          dest: '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242' as AccountId,
        },
      };

      transactionService.encodeTransactionTransformer.registerHandler({
        available: () => true,
        body(transaction) {
          if (isTransferTransaction(transaction)) {
            const extrinsic = api.tx.balances.transferKeepAlive(transaction.args.dest, transaction.args.value);
            return extrinsic.method.toHex();
          }
        },
      });

      const encodedTransaction = transactionService.encodeTransaction(decodedTransaction, api);
      expect(encodedTransaction).toEqual({
        type: 'encoded',
        callData: '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
      });
    });

    it('should throw in no encoder found', async () => {
      const api = await createMockApi();
      const decodedTransaction: TransferDecodedTransaction = {
        type: 'decoded',
        section: 'balances',
        method: 'transferKeepAlive',
        args: {
          value: '1000000000000',
          dest: '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242' as AccountId,
        },
      };

      expect(() => transactionService.encodeTransaction(decodedTransaction, api)).toThrowErrorMatchingInlineSnapshot(
        `[Error: Serializer for transaction balances.transferKeepAlive not found]`,
      );
    });

    it('should create extrinsic from any decoded transaction with special unsafe method (arg names should match with metadata)', async () => {
      const api = await createMockApi();
      const decodedTransaction: TransferDecodedTransaction = {
        type: 'decoded',
        section: 'balances',
        method: 'transferKeepAlive',
        args: {
          value: '1000000000000',
          dest: '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242' as AccountId,
        },
      };

      const extrinsic = transactionService.unsafe_createExtrinsicFromAnyTransaction(decodedTransaction, api);
      const encodedTransaction = transactionService.createEncodedTransactionFromExtrinsic(extrinsic);

      expect(encodedTransaction).toEqual({
        type: 'encoded',
        callData: '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
      });
    });

    it('should fail to craete extrinsic from any decoded transaction with special unsafe method (invalid arg name)', async () => {
      const api = await createMockApi();
      const decodedTransaction: AnyDecodedTransaction<{ value: string; destination: AccountId }> = {
        type: 'decoded',
        section: 'balances',
        method: 'transferKeepAlive',
        args: {
          value: '1000000000000',
          // actual field name is `dest`
          destination: '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242' as AccountId,
        },
      };

      expect(() =>
        transactionService.unsafe_createExtrinsicFromAnyTransaction(decodedTransaction, api),
      ).toThrowErrorMatchingInlineSnapshot(`[Error: Missing argument dest for transaction balances.transferKeepAlive]`);
    });
  });

  describe('transactionService.getInnerCallsFromCall', () => {
    it('should extract calls from batchAll', async () => {
      const api = await createMockApi();

      const transfer1 = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);
      const transfer2 = createTransferExtrinsic(api, TEST_ADDRESS_2, TRANSFER_AMOUNT_2);
      const batchCall = api.tx.utility.batchAll([transfer1, transfer2]);

      const wrappedCalls = transactionService.getInnerCallsFromCall(batchCall.method as Call);

      expect(wrappedCalls).toHaveLength(2);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
      expect(wrappedCalls?.[1]?.section).toBe('balances');
    });

    it('should return single call for non-wrapper call', async () => {
      const api = await createMockApi();

      const transferCall = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);

      const wrappedCalls = transactionService.getInnerCallsFromCall(transferCall.method as Call);

      expect(wrappedCalls).toHaveLength(1);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
      expect(wrappedCalls?.[0]?.method).toBe('transferKeepAlive');
    });

    it('should handle empty batch', async () => {
      const api = await createMockApi();

      const batchCall = api.tx.utility.batch([]);

      const wrappedCalls = transactionService.getInnerCallsFromCall(batchCall.method as Call);

      expect(wrappedCalls).toHaveLength(0);
    });

    it('should extract deeply nested calls from batch within batch', async () => {
      const api = await createMockApi();

      const transfer1 = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);
      const transfer2 = createTransferExtrinsic(api, TEST_ADDRESS_2, TRANSFER_AMOUNT_2);
      const innerBatch = api.tx.utility.batchAll([transfer1]);
      const outerBatch = api.tx.utility.batchAll([innerBatch, transfer2]);

      const wrappedCalls = transactionService.getInnerCallsFromCall(outerBatch.method as Call);

      expect(wrappedCalls).toHaveLength(2);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
      expect(wrappedCalls?.[1]?.section).toBe('balances');
    });

    it('should unwrap proxy.proxy to its inner call when target matches', async () => {
      const api = await createMockApi();

      const transfer = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);
      const proxyCall = api.tx.proxy.proxy(TEST_ADDRESS_2, null, transfer);

      const wrappedCalls = transactionService.getInnerCallsFromCall(
        proxyCall.method as Call,
        TEST_ADDRESS_2 as AccountId,
      );

      expect(wrappedCalls).toHaveLength(1);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
      expect(wrappedCalls?.[0]?.method).toBe('transferKeepAlive');
    });

    it('should unwrap proxy.proxy nested inside a batch when target matches', async () => {
      const api = await createMockApi();

      const transfer = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);
      const proxyCall = api.tx.proxy.proxy(TEST_ADDRESS_2, null, transfer);
      const batchCall = api.tx.utility.batchAll([proxyCall]);

      const wrappedCalls = transactionService.getInnerCallsFromCall(
        batchCall.method as Call,
        TEST_ADDRESS_2 as AccountId,
      );

      expect(wrappedCalls).toHaveLength(1);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
      expect(wrappedCalls?.[0]?.method).toBe('transferKeepAlive');
    });

    it('should treat proxy.proxy as a leaf when target does not match', async () => {
      const api = await createMockApi();

      const transfer = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);
      const proxyCall = api.tx.proxy.proxy(TEST_ADDRESS_2, null, transfer);
      const batchCall = api.tx.utility.batchAll([proxyCall]);

      const wrappedCalls = transactionService.getInnerCallsFromCall(
        batchCall.method as Call,
        TEST_ADDRESS_1 as AccountId,
      );

      expect(wrappedCalls).toHaveLength(1);
      expect(wrappedCalls?.[0]?.section).toBe('proxy');
      expect(wrappedCalls?.[0]?.method).toBe('proxy');
    });
  });

  describe('transactionService.getCoreCallData', () => {
    it('unwraps proxy.proxy and multisig.asMulti to the business call', async () => {
      const api = await createMockApi();
      const transferCallData =
        '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8' as HexString;
      const proxiedAccountId = '0xe4485f31d7848a3f4540dac93d8c056e7cb18b534fbab0c8367a81e1b85e464a';
      const wrappedCallData =
        '0x1e0000e4485f31d7848a3f4540dac93d8c056e7cb18b534fbab0c8367a81e1b85e464a001f0102000468161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a2420004030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e802e8030000' as HexString;

      const result = transactionService.getCoreCallData(api, wrappedCallData);

      expect(result?.callData).toEqual(transferCallData);
      expect(result?.callHash).toEqual(api.registry.createType('Call', transferCallData).hash.toHex());
      expect(result?.proxiedAccountId).toEqual(proxiedAccountId);
    });

    it('keeps plain business calls unchanged', async () => {
      const api = await createMockApi();
      const transferCallData =
        '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8' as HexString;

      const result = transactionService.getCoreCallData(api, transferCallData);

      expect(result?.callData).toEqual(transferCallData);
      expect(result?.callHash).toEqual(api.registry.createType('Call', transferCallData).hash.toHex());
    });

    it('keeps utility.asMulti calls unchanged', () => {
      const callData = '0xaaaa' as HexString;
      const callHash = '0xbbbb';
      const innerCallData = '0xcccc';
      const utilityAsMultiCall = {
        section: 'utility',
        method: 'asMulti',
        args: [undefined, undefined, undefined, { toHex: () => innerCallData }],
        toHex: () => callData,
        hash: { toHex: () => callHash },
      } as unknown as Call;
      const innerCall = {
        section: 'balances',
        method: 'transferKeepAlive',
        args: [],
        toHex: () => innerCallData,
        hash: { toHex: () => '0xdddd' },
      } as unknown as Call;
      const createType = vi.fn().mockReturnValueOnce(utilityAsMultiCall).mockReturnValueOnce(innerCall);
      const api = { registry: { createType } } as unknown as ApiPromise;

      const result = transactionService.getCoreCallData(api, callData);

      expect(result).toEqual({ callData, callHash });
      expect(createType).toHaveBeenCalledTimes(1);
    });
  });
});
