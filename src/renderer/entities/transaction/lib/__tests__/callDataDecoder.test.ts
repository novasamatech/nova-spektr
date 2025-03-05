import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';

import { getTxFromCallData } from '../callDataDecoder';

import { metadata } from './metadata';

/**
 * ATTENTION! This tests may fail on node version >= 22 because of
 * `@polkadot/rpc-provider/mock`. It uses `assert { type 'json' }` in compiled
 * code, which breaks backward compatability.
 */
describe('entities/transaction/lib/callDataDecoder', () => {
  const registry = new TypeRegistry();
  let provider: MockProvider;
  let api: ApiPromise;

  beforeAll(async () => {
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

  afterAll(() => provider.disconnect());

  test('should decode add proxy transaction', async () => {
    const transaction = getTxFromCallData(
      api,
      '0x1e0100379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe140000000000',
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

  test('should decode proxy.proxy transaction with multisig call with transfer call', async () => {
    const transaction = getTxFromCallData(
      api,
      '0x1e0000e4485f31d7848a3f4540dac93d8c056e7cb18b534fbab0c8367a81e1b85e464a001f0102000468161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a2420004030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e802e8030000',
    );

    expect(transaction.method.toHuman()).toEqual({
      args: {
        call: {
          args: {
            call: {
              args: {
                dest: {
                  Id: 'Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3',
                },
                value: '1,000,000,000,000',
              },
              method: 'transferKeepAlive',
              section: 'balances',
            },
            max_weight: {
              proofSize: '0',
              refTime: '64,000',
            },
            maybe_timepoint: null,
            other_signatories: ['Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3'],
            threshold: '2',
          },
          method: 'asMulti',
          section: 'multisig',
        },
        force_proxy_type: null,
        real: {
          Id: 'Hjdw9g44uAL4XKucHTdxRmXQJBx7t8j4Anox9NitS7z7HAL',
        },
      },
      method: 'proxy',
      section: 'proxy',
    });
  });

  test('should decode transfer call', async () => {
    const transaction = getTxFromCallData(
      api,
      '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
    );

    expect(transaction.method.toHuman()).toEqual({
      args: {
        dest: {
          Id: 'Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3',
        },
        value: '1,000,000,000,000',
      },
      method: 'transferKeepAlive',
      section: 'balances',
    });
  });

  test('should decode multisig transfer call', async () => {
    const transaction = getTxFromCallData(
      api,
      '0x1f0102000468161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242000000040002e8030000',
    );

    expect(transaction.method.toHuman()).toEqual({
      args: {
        call: {
          args: {
            remark: '0x00',
          },
          method: 'remark',
          section: 'system',
        },
        max_weight: {
          proofSize: '0',
          refTime: '64,000',
        },
        maybe_timepoint: null,
        other_signatories: ['Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3'],
        threshold: '2',
      },
      method: 'asMulti',
      section: 'multisig',
    });
  });

  test('should decode bond call', async () => {
    const transaction = getTxFromCallData(
      api,
      '0x0600070010a5d4e80308eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    );

    expect(transaction.method.toHuman()).toEqual({
      args: {
        payee: {
          Account: 'Cn1mVjBBvLJUWE8GQoeR7JduGt2GxhUXrx191ob3Si6HA9E',
        },
        value: '1,000,000,000,000',
      },
      method: 'bond',
      section: 'staking',
    });
  });

  test('should decode unstake call', async () => {
    const transaction = getTxFromCallData(api, '0x0602070010a5d4e8');

    expect(transaction.method.toHuman()).toEqual({
      args: {
        value: '1,000,000,000,000',
      },
      method: 'unbond',
      section: 'staking',
    });
  });

  test('should decode nominate call', async () => {
    const transaction = getTxFromCallData(
      api,
      '0x0605040008eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    );

    expect(transaction.method.toHuman()).toEqual({
      args: {
        targets: [
          {
            Id: 'Cn1mVjBBvLJUWE8GQoeR7JduGt2GxhUXrx191ob3Si6HA9E',
          },
        ],
      },
      method: 'nominate',
      section: 'staking',
    });
  });

  test('should decode redeem call', async () => {
    const transaction = getTxFromCallData(api, '0x060301000000');

    expect(transaction.method.toHuman()).toEqual({
      args: {
        num_slashing_spans: '1',
      },
      method: 'withdrawUnbonded',
      section: 'staking',
    });
  });

  test('should decode restake call', async () => {
    const transaction = getTxFromCallData(api, '0x0613070010a5d4e8');

    expect(transaction.method.toHuman()).toEqual({
      args: {
        value: '1,000,000,000,000',
      },
      method: 'rebond',
      section: 'staking',
    });
  });

  test('should decode stake more call', async () => {
    const transaction = getTxFromCallData(api, '0x0601070010a5d4e8');

    expect(transaction.method.toHuman()).toEqual({
      args: {
        max_additional: '1,000,000,000,000',
      },
      method: 'bondExtra',
      section: 'staking',
    });
  });

  test('should decode destination call', async () => {
    const transaction = getTxFromCallData(
      api,
      '0x06070308eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    );

    expect(transaction.method.toHuman()).toEqual({
      args: {
        payee: {
          Account: 'Cn1mVjBBvLJUWE8GQoeR7JduGt2GxhUXrx191ob3Si6HA9E',
        },
      },
      method: 'setPayee',
      section: 'staking',
    });
  });

  test('should decode destination call with no payee', async () => {
    const transaction = getTxFromCallData(api, '0x060700');

    expect(transaction.method.toHuman()).toEqual({
      args: {
        payee: 'Staked',
      },
      method: 'setPayee',
      section: 'staking',
    });
  });
});
