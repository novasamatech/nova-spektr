import { fork, allSettled } from 'effector';

import chains from '@shared/config/chains/chains.json';
import { constructorModel } from '../constructor-model';
import { KeyType, AccountType, CryptoType, ChainType, ChainAccount, ShardAccount } from '@shared/core';
import { TEST_CHAIN_ID } from '@shared/lib/utils';

describe('features/wallet/model/constructor-model', () => {
  const defaultKeys = [
    {
      name: 'Main DOT key',
      keyType: KeyType.MAIN,
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      type: AccountType.CHAIN,
      cryptoType: CryptoType.SR25519,
      chainType: ChainType.SUBSTRATE,
      derivationPath: '//polkadot//MAIN',
    },
    {
      name: 'Shard_1 DOT key',
      groupId: 'shard_1',
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
      keyType: KeyType.PUBLIC,
      type: AccountType.SHARD,
      derivationPath: '//polkadot//hot//0',
    },
    {
      name: 'Shard_2 DOT key',
      groupId: 'shard_1',
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      chainType: ChainType.SUBSTRATE,
      cryptoType: CryptoType.SR25519,
      keyType: KeyType.PUBLIC,
      type: AccountType.SHARD,
      derivationPath: '//polkadot//hot//1',
    },
  ];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should assign existing keys', async () => {
    const scope = fork();

    await allSettled(constructorModel.events.formInitiated, {
      scope,
      params: defaultKeys as Array<ChainAccount | ShardAccount>,
    });
    expect(scope.getState(constructorModel.$keys)).toEqual([defaultKeys[0], [defaultKeys[1], defaultKeys[2]]]);
  });

  test('should set Polkadot as default network', async () => {
    const scope = fork();

    await allSettled(constructorModel.events.formInitiated, { scope, params: [] });
    expect(scope.getState(constructorModel.$constructorForm.fields.network.$value)).toEqual(chains[0]);
  });

  test('should add new key on form submit', async () => {
    const scope = fork();

    await allSettled(constructorModel.$constructorForm.fields.network.onChange, {
      scope,
      params: { chainId: TEST_CHAIN_ID, specName: 'polkadot' } as unknown,
    });
    await allSettled(constructorModel.$constructorForm.fields.keyType.onChange, { scope, params: KeyType.GOVERNANCE });
    await allSettled(constructorModel.$constructorForm.submit, { scope });
    expect(scope.getState(constructorModel.$keys)).toEqual([
      {
        name: 'Governance sharded',
        keyType: KeyType.GOVERNANCE,
        chainId: TEST_CHAIN_ID,
        type: AccountType.CHAIN,
        cryptoType: CryptoType.SR25519,
        chainType: ChainType.SUBSTRATE,
        derivationPath: '//polkadot//governance',
      },
    ]);
  });

  test.skip('should add new sharded key on form submit', async () => {
    const scope = fork();

    await allSettled(constructorModel.$constructorForm.fields.network.onChange, {
      scope,
      params: { chainId: TEST_CHAIN_ID, specName: 'polkadot' } as unknown,
    });
    await allSettled(constructorModel.$constructorForm.fields.keyType.onChange, { scope, params: KeyType.GOVERNANCE });
    await allSettled(constructorModel.$constructorForm.fields.isSharded.onChange, { scope, params: true });
    await allSettled(constructorModel.$constructorForm.fields.shards.onChange, { scope, params: '1' });
    await allSettled(constructorModel.$constructorForm.fields.keyName.onChange, { scope, params: 'My custom key' });
    await allSettled(constructorModel.$constructorForm.submit, { scope });
    expect(scope.getState(constructorModel.$keys)).toEqual([
      {
        name: 'My custom key',
        keyType: KeyType.CUSTOM,
        chainId: TEST_CHAIN_ID,
        type: AccountType.SHARD,
        cryptoType: CryptoType.SR25519,
        chainType: ChainType.SUBSTRATE,
        derivationPath: '//polkadot//custom/0',
      },
    ]);
  });
});
