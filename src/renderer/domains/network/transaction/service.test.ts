import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { describe } from 'vitest';

import { transactionService } from './service';
import { metadata } from './service.mocks';
import { type AnyDecodedTransaction, type EncodedTransaction } from './types';

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

describe('Transactions service', () => {
  it('should check Transaction types', async () => {
    const decoded: AnyDecodedTransaction = { type: 'decoded', section: 'test', method: '', args: {} };
    const encoded: EncodedTransaction = { type: 'encoded', callData: '0x00' };

    expect(transactionService.isDecodedTransaction(decoded)).toEqual(true);
    expect(transactionService.isDecodedTransaction(encoded)).toEqual(false);

    expect(transactionService.isEncodedTransaction(encoded)).toEqual(true);
    expect(transactionService.isEncodedTransaction(decoded)).toEqual(false);
  });

  it('should decode transaction', async () => {
    const api = await createMockApi();
    const encodedTransfer: EncodedTransaction = {
      type: 'encoded',
      callData: '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
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

    const decodedTransfer = transactionService.decodeTransaction(encodedTransfer, api);
    expect(decodedTransfer).toMatchInlineSnapshot(`
      {
        "args": {
          "amount": "1000000000000",
          "destination": "0x0068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242",
        },
        "method": "transferKeepAlive",
        "section": "balances",
        "type": "decoded",
      }
    `);
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
