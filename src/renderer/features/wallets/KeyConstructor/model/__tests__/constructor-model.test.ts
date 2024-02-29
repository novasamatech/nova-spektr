import { fork, allSettled, Scope } from 'effector';

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

  const submitForm = async (scope: Scope, form?: any): Promise<void> => {
    await allSettled(constructorModel.$constructorForm.fields.network.onChange, {
      scope,
      params: form?.network ?? ({ chainId: TEST_CHAIN_ID, specName: 'polkadot' } as unknown),
    });
    await allSettled(constructorModel.$constructorForm.fields.keyType.onChange, {
      scope,
      params: form?.keyType ?? KeyType.GOVERNANCE,
    });
    await allSettled(constructorModel.$constructorForm.fields.isSharded.onChange, {
      scope,
      params: form?.isSharded ?? false,
    });
    await allSettled(constructorModel.$constructorForm.fields.shards.onChange, {
      scope,
      params: form?.shards,
    });
    await allSettled(constructorModel.$constructorForm.fields.keyName.onChange, {
      scope,
      params: form?.keyName,
    });
    await allSettled(constructorModel.$constructorForm.submit, { scope });
  };

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

  test('should have visible keys', async () => {
    const scope = fork({
      values: new Map().set(constructorModel.$keys, defaultKeys),
    });

    expect(scope.getState(constructorModel.$hasKeys)).toEqual(true);
  });

  test('should not have visible keys', async () => {
    const scope = fork({
      values: new Map().set(constructorModel.$keys, defaultKeys.slice(0, 1)),
    });

    expect(scope.getState(constructorModel.$hasKeys)).toEqual(false);
  });

  test('should mark existing key for removal', async () => {
    const scope = fork();

    await allSettled(constructorModel.events.formInitiated, {
      scope,
      params: defaultKeys as Array<ChainAccount | ShardAccount>,
    });
    await allSettled(constructorModel.events.keyRemoved, { scope, params: 1 });

    expect(scope.getState(constructorModel.$keysToRemove)).toEqual([[defaultKeys[1], defaultKeys[2]]]);
  });

  test('should not mark newly added key for removal', async () => {
    const scope = fork();

    await allSettled(constructorModel.events.formInitiated, {
      scope,
      params: [defaultKeys[0]] as ChainAccount[],
    });

    await submitForm(scope);
    await allSettled(constructorModel.events.keyRemoved, { scope, params: 1 });

    expect(scope.getState(constructorModel.$keysToRemove)).toEqual([]);
  });

  test('should set focus after submit', async () => {
    const scope = fork();
    const element = document.createElement('button');
    document.body.appendChild(element);

    await allSettled(constructorModel.events.focusableSet, { scope, params: element });
    await submitForm(scope);

    expect(element).toHaveFocus();
  });

  test('should not reset network on form submit', async () => {
    const scope = fork();
    const network = { chainId: TEST_CHAIN_ID, specName: 'acala' } as unknown;

    await submitForm(scope, { network });

    expect(scope.getState(constructorModel.$constructorForm.fields.network.$value)).toEqual(network);
  });

  test('should add new key on form submit', async () => {
    const scope = fork();

    await submitForm(scope);

    expect(scope.getState(constructorModel.$keysToAdd)).toEqual([
      {
        name: 'Governance',
        keyType: KeyType.GOVERNANCE,
        chainId: TEST_CHAIN_ID,
        type: AccountType.CHAIN,
        cryptoType: CryptoType.SR25519,
        chainType: ChainType.SUBSTRATE,
        derivationPath: '//polkadot//governance',
      },
    ]);
  });

  test('should add new sharded key on form submit', async () => {
    const scope = fork();

    await submitForm(scope, {
      keyType: KeyType.CUSTOM,
      isSharded: true,
      shards: '4',
      keyName: 'My custom key',
    });

    const keys = scope.getState(constructorModel.$keys) as ShardAccount[][];
    expect(keys[0]).toHaveLength(4);
    expect(keys[0][0]).toEqual({
      name: 'My custom key',
      groupId: '42',
      keyType: KeyType.CUSTOM,
      chainId: TEST_CHAIN_ID,
      type: AccountType.SHARD,
      cryptoType: CryptoType.SR25519,
      chainType: ChainType.SUBSTRATE,
      derivationPath: '//polkadot//custom//0',
    });
  });
});
