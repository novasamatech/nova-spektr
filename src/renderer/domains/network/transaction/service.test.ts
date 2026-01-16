import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { type Call } from '@polkadot/types/interfaces';
import { describe } from 'vitest';

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

  describe('wrapped calls extraction', () => {
    it('should extract calls from batchAll extrinsic', async () => {
      const api = await createMockApi();

      const transfer1 = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);
      const transfer2 = createTransferExtrinsic(api, TEST_ADDRESS_2, TRANSFER_AMOUNT_2);
      const batchExtrinsic = api.tx.utility.batchAll([transfer1, transfer2]);

      const wrappedCalls = transactionService.getWrappedCallsFromExtrinsic(batchExtrinsic);

      expect(wrappedCalls).toHaveLength(2);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
      expect(wrappedCalls?.[1]?.section).toBe('balances');
    });

    it('should return single call for non-batch extrinsic', async () => {
      const api = await createMockApi();

      const transferExtrinsic = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);

      const wrappedCalls = transactionService.getWrappedCallsFromExtrinsic(transferExtrinsic);

      expect(wrappedCalls).toHaveLength(1);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
      expect(wrappedCalls?.[0]?.method).toBe('transferKeepAlive');
    });

    it('should handle empty batch extrinsic', async () => {
      const api = await createMockApi();

      const batchExtrinsic = api.tx.utility.batch([]);

      const wrappedCalls = transactionService.getWrappedCallsFromExtrinsic(batchExtrinsic);

      expect(wrappedCalls).toHaveLength(0);
    });

    it('should extract nested calls from batch within batch', async () => {
      const api = await createMockApi();

      const transfer1 = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);
      const transfer2 = createTransferExtrinsic(api, TEST_ADDRESS_2, TRANSFER_AMOUNT_2);
      const innerBatch = api.tx.utility.batch([transfer1, transfer2]);
      const outerBatch = api.tx.utility.batch([innerBatch]);

      const wrappedCalls = transactionService.getWrappedCallsFromExtrinsic(outerBatch);

      expect(wrappedCalls).toHaveLength(2);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
      expect(wrappedCalls?.[1]?.section).toBe('balances');
    });
  });

  describe('transactionService.getWrappedCallsFromCall', () => {
    it('should extract calls from batchAll call', async () => {
      const api = await createMockApi();

      const transfer1 = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);
      const batchCall = api.tx.utility.batchAll([transfer1]);

      const wrappedCalls = transactionService.getWrappedCallsFromCall(batchCall.method as any);

      expect(wrappedCalls).toHaveLength(1);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
    });

    it('should return single call for non-batch call', async () => {
      const api = await createMockApi();

      const transferCall = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);

      const wrappedCalls = transactionService.getWrappedCallsFromCall(transferCall.method as any);

      expect(wrappedCalls).toHaveLength(1);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
      expect(wrappedCalls?.[0]?.method).toBe('transferKeepAlive');
    });

    it('should handle empty batch call', async () => {
      const api = await createMockApi();

      const batchCall = api.tx.utility.batchAll([]);

      const wrappedCalls = transactionService.getWrappedCallsFromCall(batchCall.method as Call);

      expect(wrappedCalls).toHaveLength(0);
    });

    it('should extract deeply nested calls', async () => {
      const api = await createMockApi();

      const transfer1 = createTransferExtrinsic(api, TEST_ADDRESS_1, TRANSFER_AMOUNT_1);
      const transfer2 = createTransferExtrinsic(api, TEST_ADDRESS_2, TRANSFER_AMOUNT_2);
      const innerBatch = api.tx.utility.batchAll([transfer1]);
      const outerBatch = api.tx.utility.batchAll([innerBatch, transfer2]);

      const wrappedCalls = transactionService.getWrappedCallsFromCall(outerBatch.method as Call);

      expect(wrappedCalls).toHaveLength(2);
      expect(wrappedCalls?.[0]?.section).toBe('balances');
      expect(wrappedCalls?.[1]?.section).toBe('balances');
    });
  });
});
