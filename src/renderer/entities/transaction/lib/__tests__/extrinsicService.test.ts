import { ApiPromise } from '@polkadot/api';
import { TypeRegistry } from '@polkadot/types';
import { MockProvider } from '@polkadot/rpc-provider/mock';

import { metadata } from './metadata';
import { wrapAsMulti, getExtrinsic } from '../extrinsicService';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@shared/lib/utils';
import { MultisigAccount, Signatory } from '@shared/core';
import { TransactionType } from '../../model/transaction';
import { extrinsicTests } from '../mock/extrinsicService.mock';

describe('entities/transaction/lib/extrinsicService.ts', () => {
  const registry = new TypeRegistry();
  let provider: MockProvider;
  let api: ApiPromise;

  beforeEach(async (): Promise<void> => {
    provider = new MockProvider(registry);

    const genesisHash = registry.createType('Hash', await provider.send('chain_getBlockHash', [])).toHex();

    const specVersion = 0;

    api = await ApiPromise.create({
      metadata: { [`${genesisHash}-${specVersion}`]: metadata },
      provider,
      registry,
      throwOnConnect: true,
    });
  });

  afterEach(async () => {
    await provider.disconnect();
  });

  test('should wrap transaction to multisig', async () => {
    const multisigAccount = {
      threshold: 2,
      signatories: [
        { accountId: TEST_ACCOUNTS[0] } as unknown as Signatory,
        { accountId: TEST_ACCOUNTS[1] } as unknown as Signatory,
      ],
    } as unknown as MultisigAccount;

    const transaction = wrapAsMulti(
      multisigAccount,
      TEST_ACCOUNTS[0],
      {
        address: TEST_ADDRESS,
        args: {
          delay: '0',
          delegate: 'DqEGbAJBJGuDAMN2feH4GsufAYvmYJhNAkiPxs9S4StwJ7j',
          proxyType: 'Any',
        },
        chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
        type: TransactionType.ADD_PROXY,
      },
      api,
      42,
    );

    expect(transaction).toEqual({
      address: '5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9',
      args: {
        callData: '0x1e0100379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe140000000000',
        callHash: '0x24f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b8',
        maybeTimepoint: null,
        otherSignatories: ['5F3cpq3CLZo77U6g6fHtSbpuhWfdXajs8DnBg9mBPBaPDtMB'],
        threshold: 2,
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      type: 'multisig_as_multi',
    });
  });

  test.each(extrinsicTests)('$testName', ({ transactionType, args, callData }) => {
    const extrinsic = getExtrinsic[transactionType](args, api);

    expect(extrinsic.method.toHex()).toEqual(callData);
  });
});
