import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';

import { TEST_ADDRESS } from '@/shared/lib/utils';
import { useCallDataDecoder } from '../callDataDecoder';

import { metadata } from './metadata';

/**
 * ATTENTION! This tests may fail on node version >= 22 because of
 * `@polkadot/rpc-provider/mock`. It uses `assert { type 'json' }` in compiled
 * code, which breaks backward compatability.
 */
describe('entities/transaction/lib/callDataDecoder', () => {
  const { decodeCallData } = useCallDataDecoder();

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
    const transaction = decodeCallData(
      api,
      TEST_ADDRESS,
      '0x1e0100379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe140000000000',
    );

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        delay: '0',
        delegate: 'DqEGbAJBJGuDAMN2feH4GsufAYvmYJhNAkiPxs9S4StwJ7j',
        proxyType: 'Any',
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'addProxy',
      section: 'proxy',
      type: 'add_proxy',
    });
  });

  test('should decode proxy.proxy transaction with multisig call with transfer call', async () => {
    const transaction = decodeCallData(
      api,
      TEST_ADDRESS,
      '0x1e0000e4485f31d7848a3f4540dac93d8c056e7cb18b534fbab0c8367a81e1b85e464a001f0102000468161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a2420004030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e802e8030000',
    );

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        call: '0x1f0102000468161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a2420004030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e802e8030000',
        forceProxyType: '',
        real: 'Hjdw9g44uAL4XKucHTdxRmXQJBx7t8j4Anox9NitS7z7HAL',
        transaction: {
          address: '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ',
          args: {
            call: '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
            maxWeight: {
              proofSize: '0',
              refTime: '64,000',
            },
            otherSignatories: ['Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3'],
            threshold: '2',
            timepoint: '',
          },
          chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
          method: 'asMulti',
          section: 'multisig',
          type: 'multisig_as_multi',
        },
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'proxy',
      section: 'proxy',
      type: 'proxy',
    });
  });

  test('should decode transfer call', async () => {
    const transaction = decodeCallData(
      api,
      TEST_ADDRESS,
      '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
    );

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        dest: 'Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3',
        value: '1000000000000',
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'transferKeepAlive',
      section: 'balances',
      type: 'transfer',
    });
  });

  test('should decode multisig transfer call', async () => {
    const transaction = decodeCallData(
      api,
      TEST_ADDRESS,
      '0x1f0102000468161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242000000040002e8030000',
    );

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        call: '0x00000400',
        maxWeight: {
          proofSize: '0',
          refTime: '64,000',
        },
        otherSignatories: ['Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3'],
        threshold: '2',
        timepoint: '',
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'asMulti',
      section: 'multisig',
      type: 'multisig_as_multi',
    });
  });

  test('should decode bond call', async () => {
    const transaction = decodeCallData(
      api,
      TEST_ADDRESS,
      '0x0600070010a5d4e80308eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    );

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        payee: {
          Account: 'Cn1mVjBBvLJUWE8GQoeR7JduGt2GxhUXrx191ob3Si6HA9E',
        },
        value: '1000000000000',
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'bond',
      section: 'staking',
      type: 'bond',
    });
  });

  test('should decode unstake call', async () => {
    const transaction = decodeCallData(api, TEST_ADDRESS, '0x0602070010a5d4e8');

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        value: '1000000000000',
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'unbond',
      section: 'staking',
      type: 'unbond',
    });
  });

  test('should decode nominate call', async () => {
    const transaction = decodeCallData(
      api,
      TEST_ADDRESS,
      '0x0605040008eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    );

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        targets: ['Cn1mVjBBvLJUWE8GQoeR7JduGt2GxhUXrx191ob3Si6HA9E'],
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'nominate',
      section: 'staking',
      type: 'nominate',
    });
  });

  test('should decode redeem call', async () => {
    const transaction = decodeCallData(api, TEST_ADDRESS, '0x060301000000');

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {},
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'withdrawUnbonded',
      section: 'staking',
      type: 'withdrawUnbonded',
    });
  });

  test('should decode restake call', async () => {
    const transaction = decodeCallData(api, TEST_ADDRESS, '0x0613070010a5d4e8');

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        value: '1000000000000',
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'rebond',
      section: 'staking',
      type: 'rebond',
    });
  });

  test('should decode stake more call', async () => {
    const transaction = decodeCallData(api, TEST_ADDRESS, '0x0601070010a5d4e8');

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        maxAdditional: '1000000000000',
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'bondExtra',
      section: 'staking',
      type: 'bondExtra',
    });
  });

  test('should decode destination call', async () => {
    const transaction = decodeCallData(
      api,
      TEST_ADDRESS,
      '0x06070308eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    );

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        payee: { Account: 'Cn1mVjBBvLJUWE8GQoeR7JduGt2GxhUXrx191ob3Si6HA9E' },
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'setPayee',
      section: 'staking',
      type: 'payee',
    });
  });

  test('should decode destination call with no payee', async () => {
    const transaction = decodeCallData(api, TEST_ADDRESS, '0x060700');

    expect(transaction).toEqual({
      address: TEST_ADDRESS,
      args: {
        payee: 'Staked',
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'setPayee',
      section: 'staking',
      type: 'payee',
    });
  });
});
