import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { describe } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';

import { transactionService } from './service';
import { metadata } from './service.mocks';
import {
  type AnyDecodedTransaction,
  type BatchTransaction,
  type DecodedTransaction,
  type EncodedTransaction,
} from './types';

type TrasferDecodedTransaction = DecodedTransaction<{
  destination: AccountId;
  amount: string;
}>;

const isTransferTransaction = (t: AnyDecodedTransaction): t is TrasferDecodedTransaction => {
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
      const decodedTransaction: TrasferDecodedTransaction = {
        type: 'decoded',
        section: 'balances',
        method: 'transferKeepAlive',
        args: {
          amount: '1000000000000',
          destination: '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242' as AccountId,
        },
      };

      transactionService.decodeTransactionTransformer.registerHandler({
        available: () => true,
        body(extrinsic) {
          if (extrinsic.method.section === 'balances' && extrinsic.method.method === 'transferKeepAlive') {
            const destination = extrinsic.args[0]?.toHex();
            const amount = extrinsic.args[1]?.toString();

            return {
              type: 'decoded',
              section: extrinsic.method.section,
              method: extrinsic.method.method,
              args: {
                destination,
                amount,
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

    it('should decode batch', async () => {
      const api = await createMockApi();
      const transaction: EncodedTransaction = {
        callData: '0x18000404030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
        type: 'encoded',
      };

      transactionService.decodeTransactionTransformer.registerHandler({
        available: () => true,
        body(extrinsic) {
          if (extrinsic.method.section === 'balances' && extrinsic.method.method === 'transferKeepAlive') {
            const destination = extrinsic.args[0]?.toHex();
            const amount = extrinsic.args[1]?.toString();

            return {
              type: 'decoded',
              section: extrinsic.method.section,
              method: extrinsic.method.method,
              args: {
                destination,
                amount,
              },
            };
          }
        },
      });

      expect(transactionService.decodeTransaction(transaction, api)).toMatchInlineSnapshot(`
        {
          "args": {
            "calls": [
              {
                "args": {
                  "amount": "1000000000000",
                  "destination": "0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242",
                },
                "method": "transferKeepAlive",
                "section": "balances",
                "type": "decoded",
              },
            ],
          },
          "method": "batch",
          "section": "utility",
          "type": "decoded",
        }
      `);
    });
  });

  describe('encoding', () => {
    it('should encode transaction', async () => {
      const api = await createMockApi();
      const decodedTransaction: TrasferDecodedTransaction = {
        type: 'decoded',
        section: 'balances',
        method: 'transferKeepAlive',
        args: {
          amount: '1000000000000',
          destination: '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242' as AccountId,
        },
      };

      transactionService.encodeTransactionTransformer.registerHandler({
        available: () => true,
        body(transaction) {
          if (isTransferTransaction(transaction)) {
            const extrinsic = api.tx.balances.transferKeepAlive(transaction.args.destination, transaction.args.amount);
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
      const decodedTransaction: TrasferDecodedTransaction = {
        type: 'decoded',
        section: 'balances',
        method: 'transferKeepAlive',
        args: {
          amount: '1000000000000',
          destination: '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242' as AccountId,
        },
      };

      expect(() => transactionService.encodeTransaction(decodedTransaction, api)).toThrowErrorMatchingInlineSnapshot(
        `[Error: Serializer for transaction balances.transferKeepAlive not found]`,
      );
    });

    it('should encode batch', async () => {
      const api = await createMockApi();
      const transaction: BatchTransaction = {
        type: 'decoded',
        section: 'utility',
        method: 'batch',
        args: {
          calls: [
            {
              type: 'decoded',
              section: 'balances',
              method: 'transferKeepAlive',
              args: {
                amount: '1000000000000',
                destination: '0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242' as AccountId,
              },
            },
          ],
        },
      };

      transactionService.encodeTransactionTransformer.registerHandler({
        available: () => true,
        body(transaction) {
          if (isTransferTransaction(transaction)) {
            const extrinsic = api.tx.balances.transferKeepAlive(transaction.args.destination, transaction.args.amount);
            return extrinsic.method.toHex();
          }
        },
      });

      expect(transactionService.encodeTransaction(transaction, api)).toMatchInlineSnapshot(`
        {
          "callData": "0x18000404030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8",
          "type": "encoded",
        }
      `);
    });
  });

  describe('extrinsic', () => {
    it('should create submittable extrinsic', async () => {
      const api = await createMockApi();
      const transaction = transactionService.createSubmittableExtrinsic(
        {
          type: 'encoded',
          callData: '0x1e0100379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe140000000000',
        },
        api,
      );

      expect(transaction.method.toHuman()).toEqual({
        args: {
          delay: '0',
          delegate: {
            Id: 'DqEGbAJBJGuDAMN2feH4GsufAYvmYJhNAkiPxs9S4StwJ7j',
          },
          proxy_type: 'Any',
        },
        method: 'addProxy',
        section: 'proxy',
      });
    });
  });
});
