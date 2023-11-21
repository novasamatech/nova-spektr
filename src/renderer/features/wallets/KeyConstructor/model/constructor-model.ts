import { createForm } from 'effector-forms';
import { createStore, createEvent, sample, combine, forward } from 'effector';

import type { ChainAccount, ShardAccount, Chain } from '@shared/core';
import { KeyType, AccountType, CryptoType, ChainType } from '@shared/core';
import { chainsService } from '@entities/network';
import { accountUtils } from '@entities/wallet';

const chains = chainsService.getChainsData({ sort: true });

const MOCKS = accountUtils.getAccountsAndShardGroups([
  {
    name: 'DOT key',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    keyType: KeyType.STAKING,
    type: AccountType.CHAIN,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    derivationPath: '//polkadot//staking',
  },
  {
    name: 'DOT key',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    keyType: KeyType.HOT,
    type: AccountType.CHAIN,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    derivationPath: '//polkadot//hot',
  },
  {
    name: 'DOT key',
    groupId: 'shard_1',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    type: AccountType.SHARD,
    derivationPath: '//polkadot//hot//0',
  },
  {
    name: 'DOT key',
    groupId: 'shard_1',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    type: AccountType.SHARD,
    derivationPath: '//polkadot//hot//1',
  },
] as any[]);
const $keys = createStore<Array<ChainAccount | ShardAccount>>(MOCKS as Array<ChainAccount | ShardAccount>);

const $constructorForm = createForm({
  fields: {
    network: {
      init: {} as Chain,
    },
    keyType: {
      init: '' as KeyType,
      rules: [{ name: 'required', errorText: 'Please select key type', validator: Boolean }],
    },
    isSharded: {
      init: false,
    },
    shards: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'Enter number',
          validator: (value, { isSharded }): boolean => !isSharded || Boolean(value),
        },
        {
          name: 'NaN',
          errorText: 'Not a number',
          validator: (value, { isSharded }): boolean => !isSharded || !Number.isNaN(Number(value)),
        },
        {
          name: 'max',
          errorText: 'Max 50',
          validator: (value, { isSharded }): boolean => !isSharded || Number(value) <= 50,
        },
        {
          name: 'min',
          errorText: 'Min 2',
          validator: (value, { isSharded }): boolean => !isSharded || Number(value) >= 2,
        },
      ],
    },
    keyName: {
      init: '',
      rules: [{ name: 'required', errorText: 'Please enter key display name', validator: Boolean }],
    },
    derivationPath: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'Please enter derivation path',
          validator: (value, { keyType }): boolean => keyType !== KeyType.CUSTOM || Boolean(value),
        },
        // { name: 'password', errorText: 'Password derivation path is not allowed', validator: Boolean },
        // { name: 'format', errorText: 'Wrong derivation path format', validator: Boolean },
        // { name: 'duplicate', errorText: 'Duplicated derivation path', validator: Boolean },
      ],
    },
  },
  validateOn: ['submit'],
});

const $derivationEnabled = combine($constructorForm.fields.keyType.$value, (keyType) => {
  return keyType === KeyType.CUSTOM;
});

const keyRemoved = createEvent<number>();
const formInitiated = createEvent();

sample({
  clock: formInitiated,
  fn: () => ({
    network: chains[0],
    keyType: '' as KeyType,
    isSharded: false,
    shards: '',
    keyName: '',
    derivationPath: '',
  }),
  target: $constructorForm.setInitialForm,
});

forward({
  from: $constructorForm.formValidated,
  to: [$constructorForm.reset, formInitiated],
});

sample({
  clock: keyRemoved,
  source: $keys,
  fn: (keys, indexToRemove) => {
    // TODO: handle ShardedAccounts + Shards
    return keys.filter((_, index) => index !== indexToRemove);
  },
  target: $keys,
});

sample({
  clock: $constructorForm.fields.keyType.$value,
  source: $constructorForm.fields.network.$value,
  fn: (chain, keyType) => {
    return keyType === KeyType.CUSTOM ? '' : `//${chain.name.toLowerCase()}//${keyType}`;
  },
  target: $constructorForm.fields.derivationPath.$value,
});

export const constructorModel = {
  $keys,
  $derivationEnabled,
  $constructorForm,
  events: {
    keyRemoved,
    formInitiated,
  },
};
