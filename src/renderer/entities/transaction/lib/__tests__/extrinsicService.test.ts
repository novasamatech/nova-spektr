import { ApiPromise } from '@polkadot/api';
import { TypeRegistry } from '@polkadot/types';
import { MockProvider } from '@polkadot/rpc-provider/mock';

import { metadata } from './metadata';
import { wrapAsMulti, getExtrinsic } from '../extrinsicService';
import { TEST_ACCOUNT_ID, TEST_ACCOUNT_ID_2, TEST_ADDRESS } from '@shared/lib/utils';
import { MultisigAccount, Signatory } from '@shared/core';
import { TransactionType } from '../../model/transaction';

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
        { accountId: TEST_ACCOUNT_ID } as unknown as Signatory,
        { accountId: TEST_ACCOUNT_ID_2 } as unknown as Signatory,
      ],
    } as unknown as MultisigAccount;

    const transaction = wrapAsMulti(
      multisigAccount,
      TEST_ACCOUNT_ID,
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

  test.each([
    [
      {
        callData: '0x1e0100379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe140000000000',
        callHash: '0x24f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b8',
        maybeTimepoint: null,
        otherSignatories: ['5F3cpq3CLZo77U6g6fHtSbpuhWfdXajs8DnBg9mBPBaPDtMB'],
        threshold: 2,
      },
      TransactionType.MULTISIG_AS_MULTI,
      '0x1f0102000483e0844510ede3aea6953c9886d9a51abdd944b6395de7b83bbce6dffce0c765000000000000',
    ],
    [
      {
        callHash: '0x24f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b8',
        maybeTimepoint: { height: 1, index: 1 },
        otherSignatories: ['5F3cpq3CLZo77U6g6fHtSbpuhWfdXajs8DnBg9mBPBaPDtMB'],
        threshold: 2,
        maxWeight: {
          refTime: '64000',
          proofSize: '0',
        },
      },
      TransactionType.MULTISIG_APPROVE_AS_MULTI,
      '0x1f0202000483e0844510ede3aea6953c9886d9a51abdd944b6395de7b83bbce6dffce0c76501010000000100000024f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b802e8030000',
    ],
    [
      {
        callHash: '0x24f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b8',
        maybeTimepoint: { height: 1, index: 1 },
        otherSignatories: ['5F3cpq3CLZo77U6g6fHtSbpuhWfdXajs8DnBg9mBPBaPDtMB'],
        threshold: 2,
      },
      TransactionType.MULTISIG_CANCEL_AS_MULTI,
      '0x1f0302000483e0844510ede3aea6953c9886d9a51abdd944b6395de7b83bbce6dffce0c765010000000100000024f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b8',
    ],
    [
      { dest: 'Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3', value: '1000000000000' },
      TransactionType.TRANSFER,
      '0x04000068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
    ],
    [
      {
        delay: '0',
        delegate: 'DqEGbAJBJGuDAMN2feH4GsufAYvmYJhNAkiPxs9S4StwJ7j',
        proxyType: 'Any',
      },
      TransactionType.ADD_PROXY,
      '0x1e0100379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe140000000000',
    ],
    [
      {
        delay: '0',
        delegate: 'DqEGbAJBJGuDAMN2feH4GsufAYvmYJhNAkiPxs9S4StwJ7j',
        proxyType: 'Any',
      },
      TransactionType.REMOVE_PROXY,
      '0x1e0200379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe140000000000',
    ],
    [
      {
        real: TEST_ADDRESS,
        transaction: {
          address: TEST_ADDRESS,
          args: {
            dest: TEST_ADDRESS,
            value: '1000000000000',
          },
          chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
          method: 'transferAllowDeath',
          section: 'balances',
          type: 'transfer',
        },
      },
      TransactionType.PROXY,
      '0x1e000008eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f60140004000008eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014070010a5d4e8',
    ],
    [
      { value: 1000000000000, payee: { Account: TEST_ACCOUNT_ID } },
      TransactionType.BOND,
      '0x0600070010a5d4e80308eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    ],
    [
      { payee: { Account: TEST_ACCOUNT_ID } },
      TransactionType.DESTINATION,
      '0x06070308eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    ],
    [{ maxAdditional: 1000000000000 }, TransactionType.STAKE_MORE, '0x0601070010a5d4e8'],
    [{ value: 1000000000000 }, TransactionType.UNSTAKE, '0x0602070010a5d4e8'],
    [{ value: 1000000000000 }, TransactionType.RESTAKE, '0x0613070010a5d4e8'],
    [{ numSlashingSpans: 1 }, TransactionType.REDEEM, '0x060301000000'],
    [
      { targets: [TEST_ACCOUNT_ID] },
      TransactionType.NOMINATE,
      '0x0605040008eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    ],
    [{}, TransactionType.CHILL, '0x0606'],
    [
      {
        transactions: [
          {
            address: TEST_ADDRESS,
            args: {
              value: '1000000000000',
            },
            chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
            method: 'unbond',
            section: 'staking',
            type: TransactionType.UNSTAKE,
          },
          {
            address: TEST_ADDRESS,
            args: {},
            chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
            method: 'chill',
            section: 'staking',
            type: TransactionType.CHILL,
          },
        ],
      },
      TransactionType.BATCH_ALL,
      '0x1802080602070010a5d4e80606',
    ],
  ])(
    'should create extrinsic object for transaction',
    (args: Record<string, any>, transactionType: TransactionType, expected: string) => {
      const extrinsic = getExtrinsic[transactionType](args, api);

      expect(extrinsic.method.toHex()).toEqual(expected);
    },
  );
});
