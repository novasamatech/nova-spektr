import { createForm } from 'effector-forms';
import { createStore, createEvent, sample, combine } from 'effector';

import type { ChainAccount, ShardAccount, Chain } from '@shared/core';
import { KeyType, AccountType, CryptoType, ChainType } from '@shared/core';
import { chainsService } from '@entities/network';

// type KeyAccount = ChainAccount | ShardAccount;

const MOCKS = [
  {
    name: 'DOT key',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    keyType: KeyType.STAKING,
    type: AccountType.CHAIN,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    derivationPath: '//polkadot//staking',
  } as Omit<ChainAccount, 'walletId' | 'id' | 'accountId' | 'baseId'>,
  {
    name: 'DOT key',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    keyType: KeyType.HOT,
    type: AccountType.CHAIN,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    derivationPath: '//polkadot//hot',
  } as Omit<ChainAccount, 'walletId' | 'id' | 'accountId' | 'baseId'>,
  {
    name: 'DOT key',
    groupId: 'shard_1',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    type: AccountType.SHARD,
    derivationPath: '//polkadot//hot//0',
  } as Omit<ShardAccount, 'walletId' | 'id' | 'accountId'>,
  {
    name: 'DOT key',
    groupId: 'shard_1',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    type: AccountType.SHARD,
    derivationPath: '//polkadot//hot//0',
  } as Omit<ShardAccount, 'walletId' | 'id' | 'accountId'>,
];
const $keys = createStore<any[]>(MOCKS);

const $constructorForm = createForm({
  fields: {
    network: {
      init: {} as Chain,
    },
    keyType: {
      init: '' as KeyType,
      rules: [{ name: 'required', errorText: 'error keytype', validator: Boolean }],
    },
    isSharded: {
      init: false,
    },
    shards: {
      init: '',
      rules: [
        { name: 'required', errorText: 'Enter number', validator: Boolean },
        { name: 'max', errorText: 'Max 50', validator: validateMaxShardsAmount },
        { name: 'min', errorText: 'Min 2', validator: validateMinShardsAmount },
      ],
    },
    keyName: {
      init: '',
      rules: [{ name: 'required', errorText: 'Please enter key display name', validator: Boolean }],
    },
    derivationPath: {
      init: '',
      rules: [
        { name: 'required', errorText: 'Please enter derivation path', validator: Boolean },
        // { name: 'password', errorText: 'Password derivation path is not allowed', validator: Boolean },
        // { name: 'format', errorText: 'Wrong derivation path format', validator: Boolean },
        // { name: 'duplicate', errorText: 'Duplicated derivation path', validator: Boolean },
      ],
    },
  },
  validateOn: ['submit'],
});

function validateMaxShardsAmount(value: string): boolean {
  return !value || Number(value) <= 50;
}
function validateMinShardsAmount(value: string): boolean {
  return !value || Number(value) >= 2;
}

const $derivationEnabled = combine($constructorForm.fields.keyType.$value, (keyType) => {
  return keyType === KeyType.CUSTOM;
});

const keyRemoved = createEvent<number>();
const formInitiated = createEvent();

// forward({ from: $constructorForm.formValidated, to: $constructorForm.reset });

sample({
  clock: formInitiated,
  fn: () => {
    const chains = chainsService.getChainsData();

    return {
      network: chainsService.sortChains(chains)[0],
      keyType: '' as KeyType,
      isSharded: false,
      shards: '',
      keyName: '',
      derivationPath: '',
    };
  },
  target: $constructorForm.setInitialForm,
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
    return `//${chain.name.toLowerCase()}//${keyType}`;
  },
  target: $constructorForm.fields.derivationPath.onChange,
});

export const constructorModel = {
  $keys,
  $derivationEnabled,
  $constructorForm,
  events: {
    keyRemoved,
  },
};
