import { createForm } from 'effector-forms';
import { createStore, createEvent, sample, combine, forward, createEffect } from 'effector';
import { spread } from 'patronum';

import type { ChainAccount, ShardAccount, Chain } from '@shared/core';
import { KeyType, AccountType, CryptoType, ChainType } from '@shared/core';
import { chainsService } from '@entities/network';
import { accountUtils } from '@entities/wallet';
import { validateDerivation } from '@shared/lib/utils';

const KEY_NAMES = {
  [KeyType.MAIN]: 'Main',
  [KeyType.HOT]: 'Hot account',
  [KeyType.PUBLIC]: 'Pub account',
  [KeyType.STAKING]: 'Staking',
  [KeyType.GOVERNANCE]: 'Governance',
  [KeyType.CUSTOM]: '',
};

const chains = chainsService.getChainsData({ sort: true });

const MOCKS = accountUtils
  .getAccountsAndShardGroups([
    {
      name: 'DOT key',
      keyType: KeyType.MAIN,
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      type: AccountType.CHAIN,
      cryptoType: CryptoType.SR25519,
      chainType: ChainType.SUBSTRATE,
      derivationPath: '//polkadot//main',
    },
    {
      name: 'DOT key',
      keyType: KeyType.STAKING,
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      type: AccountType.CHAIN,
      cryptoType: CryptoType.SR25519,
      chainType: ChainType.SUBSTRATE,
      derivationPath: '//polkadot//staking',
    },
    {
      name: 'DOT key',
      keyType: KeyType.HOT,
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
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
  ] as any[])
  .filter((k) => Array.isArray(k) || k.keyType !== KeyType.MAIN);

// TODO: filter MAIN keys
const $keys = createStore<Array<ChainAccount | ShardAccount[]>>(MOCKS);

type FormValues = {
  network: Chain;
  keyType: KeyType;
  isSharded: boolean;
  shards: string;
  keyName: string;
  derivationPath: string;
};
const $constructorForm = createForm<FormValues>({
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
        {
          name: 'password',
          errorText: 'Password derivation path is not allowed',
          validator: (value): boolean => !/\/\/\//g.test(value),
        },
        {
          name: 'format',
          errorText: 'Wrong derivation path format',
          validator: validateDerivation,
        },
        // { name: 'duplicate', errorText: 'Duplicated derivation path', validator: Boolean },
      ],
    },
  },
  validateOn: ['submit'],
});

const $shardedEnabled = combine($constructorForm.fields.keyType.$value, (keyType) => {
  return [KeyType.MAIN, KeyType.STAKING, KeyType.GOVERNANCE, KeyType.CUSTOM].includes(keyType);
});

const $derivationEnabled = combine($constructorForm.fields.keyType.$value, (keyType) => {
  return keyType === KeyType.CUSTOM;
});

const $elementToFocus = createStore<HTMLButtonElement | null>(null);

const keyRemoved = createEvent<number>();
const formInitiated = createEvent();
const focusableSet = createEvent<HTMLButtonElement>();

const focusElementFx = createEffect((element: HTMLButtonElement) => {
  element.focus();
});

const addNewKeyFx = createEffect((formValues: FormValues): ChainAccount | ShardAccount[] => {
  const base = {
    name: formValues.keyName,
    keyType: formValues.keyType,
    chainId: formValues.network.chainId,
    type: AccountType.CHAIN,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    derivationPath: formValues.derivationPath,
  };

  if (!formValues.isSharded) return base as ChainAccount;

  const groupId = crypto.randomUUID();

  return Array.from({ length: Number(formValues.shards) }, (_, index) => {
    return {
      ...base,
      groupId,
      type: AccountType.SHARD,
      derivationPath: `${formValues.derivationPath}//${index}`,
    } as ShardAccount;
  });
});

forward({ from: focusableSet, to: $elementToFocus });

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

sample({
  clock: $shardedEnabled,
  filter: (shardedEnabled) => !shardedEnabled,
  fn: () => ({ isSharded: false, shards: '' }),
  target: spread({
    targets: {
      isSharded: $constructorForm.fields.isSharded.$value,
      shards: $constructorForm.fields.shards.$value,
    },
  }),
});

forward({
  from: $constructorForm.formValidated,
  to: addNewKeyFx,
});

forward({
  from: $constructorForm.formValidated,
  to: [$constructorForm.reset, formInitiated],
});

sample({
  clock: addNewKeyFx.doneData,
  source: $keys,
  fn: (keys, newKeys) => {
    const keysToInsert = Array.isArray(newKeys) ? [newKeys] : newKeys;

    return keys.concat(keysToInsert);
  },
  target: $keys,
});

sample({
  clock: $constructorForm.formValidated,
  source: $elementToFocus,
  filter: (element): element is HTMLButtonElement => Boolean(element),
  target: focusElementFx,
});

sample({
  clock: $constructorForm.fields.keyType.onChange,
  source: $constructorForm.fields.network.$value,
  fn: (chain, keyType) => {
    const network = `//${chain.specName}`;
    const type = keyType === KeyType.MAIN ? '' : `//${keyType}`;

    return {
      keyName: KEY_NAMES[keyType],
      derivationPath: `${network}${type}`,
    };
  },
  target: spread({
    targets: {
      keyName: $constructorForm.fields.keyName.$value,
      derivationPath: $constructorForm.fields.derivationPath.$value,
    },
  }),
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

export const constructorModel = {
  $keys,
  $shardedEnabled,
  $derivationEnabled,
  $constructorForm,
  events: {
    keyRemoved,
    focusableSet,
    formInitiated,
  },
};
