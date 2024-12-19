import { type Scope, allSettled, fork } from 'effector';

import {
  AccountType,
  type ChainAccount,
  type ChainId,
  ChainType,
  CryptoType,
  KeyType,
  type ShardAccount,
} from '@/shared/core';
import { TEST_CHAIN_ID } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { constructorModel } from '../constructor-model';

import { constructorMock } from './mocks/constructor-mock';

describe('features/wallet/model/constructor-model', () => {
  const { customKey, defaultKeys, chainsMap } = constructorMock;

  const submitForm = async (scope: Scope, form?: any): Promise<void> => {
    const { chainId, keyType, isSharded, shards, keyName } = constructorModel.$constructorForm.fields;

    await allSettled(chainId.onChange, { scope, params: form?.chainId ?? TEST_CHAIN_ID });
    await allSettled(keyType.onChange, { scope, params: form?.keyType ?? KeyType.HOT });
    await allSettled(isSharded.onChange, { scope, params: form?.isSharded ?? false });
    await allSettled(shards.onChange, { scope, params: form?.shards ?? 0 });
    await allSettled(keyName.onChange, { scope, params: form?.keyName ?? 'Hot wallet account' });
    await allSettled(constructorModel.$constructorForm.submit, { scope });
  };

  test('should assign existing keys', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, chainsMap),
    });

    await allSettled(constructorModel.events.formInitiated, {
      scope,
      params: defaultKeys as (ChainAccount | ShardAccount)[],
    });

    expect(scope.getState(constructorModel.$keys)).toEqual([defaultKeys[0], [defaultKeys[1], defaultKeys[2]]]);
  });

  test('should set Polkadot as default network', async () => {
    const polkadot = Object.values(chainsMap)[0].chainId;

    const scope = fork({
      values: new Map().set(networkModel.$chains, chainsMap),
    });

    await allSettled(constructorModel.events.formInitiated, { scope, params: [] });

    expect(scope.getState(constructorModel.$constructorForm.fields.chainId.$value)).toEqual(polkadot);
  });

  test('should have visible keys', () => {
    const scope = fork({
      values: new Map().set(constructorModel.$keysToAdd, defaultKeys).set(networkModel.$chains, chainsMap),
    });

    expect(scope.getState(constructorModel.$hasKeys)).toEqual(true);
  });

  test('should mark existing key for removal', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, chainsMap),
    });

    await allSettled(constructorModel.events.formInitiated, {
      scope,
      params: defaultKeys as (ChainAccount | ShardAccount)[],
    });
    await allSettled(constructorModel.events.keyRemoved, { scope, params: 1 });

    expect(scope.getState(constructorModel.$keysToRemove)).toEqual([[defaultKeys[1], defaultKeys[2]]]);
  });

  test('should not mark newly added key for removal', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, chainsMap),
    });

    await allSettled(constructorModel.events.formInitiated, {
      scope,
      params: [defaultKeys[0]] as ChainAccount[],
    });

    await submitForm(scope);
    await allSettled(constructorModel.events.keyRemoved, { scope, params: 1 });

    expect(scope.getState(constructorModel.$keysToRemove)).toEqual([]);
  });

  test('should not reset network on form submit', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, chainsMap),
    });
    const chainId = '0x123' as ChainId;

    await submitForm(scope, { chainId });

    expect(scope.getState(constructorModel.$constructorForm.fields.chainId.$value)).toEqual(chainId);
  });

  test('should add new key on form submit', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, chainsMap),
    });

    await submitForm(scope);

    expect(scope.getState(constructorModel.$keysToAdd)).toEqual([
      {
        name: 'Hot wallet account',
        keyType: KeyType.HOT,
        chainId: TEST_CHAIN_ID,
        type: AccountType.CHAIN,
        cryptoType: CryptoType.SR25519,
        chainType: ChainType.SUBSTRATE,
        derivationPath: '//polkadot//hot',
      },
    ]);
  });

  test('should add new sharded key on form submit', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, chainsMap),
    });

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

  test('should check derivations path to be unique inside network', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, chainsMap),
    });

    await allSettled(constructorModel.events.formInitiated, {
      scope,
      params: [customKey] as ChainAccount[],
    });

    const network = { chainId: customKey.chainId, specName: 'polkadot' } as unknown;

    await submitForm(scope, {
      keyType: KeyType.CUSTOM,
      isSharded: false,
      keyName: 'My main key',
      network,
    });

    const validationErrors = scope.getState(constructorModel.$constructorForm.fields.derivationPath.$errors);

    expect(validationErrors[0]?.rule).toEqual('duplicated');
  });

  test.each([
    [KeyType.MAIN, false],
    [KeyType.PUBLIC, false],
    [KeyType.HOT, false],
    [KeyType.CUSTOM, true],
  ])(`should calculate sharded key for %s`, async (keyType: KeyType, expected: boolean) => {
    const scope = fork();

    await allSettled(constructorModel.$constructorForm.fields.keyType.onChange, { scope, params: keyType });
    expect(scope.getState(constructorModel.$isKeyTypeSharded)).toEqual(expected);
  });
});
