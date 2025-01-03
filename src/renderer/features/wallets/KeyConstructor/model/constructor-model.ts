import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { spread } from 'patronum';

import {
  AccountType,
  type Chain,
  type ChainId,
  CryptoType,
  KeyType,
  SigningType,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { derivationHasPassword, nonNullable, validateDerivation } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { KEY_NAMES, SHARDED_KEY_NAMES, accountUtils } from '@/entities/wallet';

export const DEFAULT_CHAIN = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

const formInitiated = createEvent<(VaultChainAccount | VaultShardAccount)[]>();
const formStarted = createEvent();
const keyRemoved = createEvent<number>();

const $existingKeys = createStore<(VaultChainAccount | VaultShardAccount[])[]>([]);
const $keysToAdd = createStore<(VaultChainAccount | VaultShardAccount[])[]>([]).reset(formStarted);
const $keysToRemove = createStore<(VaultChainAccount | VaultShardAccount[])[]>([]).reset(formStarted);

const $keys = combine(
  {
    existingKeys: $existingKeys,
    keysToAdd: $keysToAdd,
    keysToRemove: $keysToRemove,
  },
  ({ existingKeys, keysToAdd, keysToRemove }) => {
    return existingKeys.filter((key) => !keysToRemove.includes(key)).concat(keysToAdd);
  },
);

type FormValues = {
  chainId: ChainId;
  keyType: KeyType | null;
  isSharded: boolean;
  shards: string;
  keyName: string;
  derivationPath: string;
};
const $constructorForm = createForm<FormValues>({
  fields: {
    chainId: {
      init: DEFAULT_CHAIN,
    },
    keyType: {
      init: null,
      rules: [{ name: 'required', errorText: 'Please select key type', validator: nonNullable }],
    },
    isSharded: {
      init: false,
    },
    shards: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'dynamicDerivations.constructor.numberRequiredError',
          validator: (value, { isSharded }) => !isSharded || Boolean(value),
        },
        {
          name: 'NaN',
          errorText: 'dynamicDerivations.constructor.notNumberError',
          validator: (value, { isSharded }) => !isSharded || !Number.isNaN(Number(value)),
        },
        {
          name: 'maxAmount',
          errorText: 'dynamicDerivations.constructor.maxShardsError',
          validator: (value, { isSharded }) => !isSharded || Number(value) <= 50,
        },
        {
          name: 'minAmount',
          errorText: 'dynamicDerivations.constructor.minShardsError',
          validator: (value, { isSharded }) => !isSharded || Number(value) >= 2,
        },
      ],
    },
    keyName: {
      init: '',
      rules: [{ name: 'required', errorText: 'dynamicDerivations.constructor.displayNameError', validator: Boolean }],
    },
    derivationPath: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'dynamicDerivations.constructor.requiredDerivationError',
          validator: (value, { keyType }) => keyType !== KeyType.CUSTOM || Boolean(value),
        },
        {
          name: 'hasPassword',
          errorText: 'dynamicDerivations.constructor.passwordDerivationError',
          validator: (value) => !derivationHasPassword(value),
        },
        {
          name: 'badFormat',
          errorText: 'dynamicDerivations.constructor.wrongDerivationError',
          validator: validateDerivation,
        },
        {
          name: 'duplicated',
          source: $keys,
          errorText: 'dynamicDerivations.constructor.duplicateDerivationError',
          validator: (value, { chainId }, keys: (VaultChainAccount | VaultShardAccount[])[]) => {
            return keys.every((key) => {
              const keyToCheck = Array.isArray(key) ? key[0] : key;

              return keyToCheck.chainId !== chainId || !keyToCheck.derivationPath.includes(value);
            });
          },
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const $hasChanged = createStore<boolean>(false).reset(formStarted);

const $isKeyTypeSharded = combine($constructorForm.fields.keyType.$value, (keyType): boolean => {
  return keyType === KeyType.CUSTOM;
});

const $derivationEnabled = combine($constructorForm.fields.keyType.$value, (keyType): boolean => {
  return keyType === KeyType.CUSTOM;
});

const $hasKeys = combine($keys, (keys) => Boolean(keys.length));

const $chain = combine(
  {
    chains: networkModel.$chains,
    chainId: $constructorForm.fields.chainId.$value,
  },
  ({ chains, chainId }): Chain | null => {
    return chains[chainId] ?? null;
  },
);

type AddKeyParams = {
  chain: Chain;
  formValues: FormValues;
};
const addNewKeyFx = createEffect(({ chain, formValues }: AddKeyParams): VaultChainAccount | VaultShardAccount[] => {
  const isEthereumBased = networkUtils.isEthereumBased(chain.options);

  const base = {
    type: 'chain',
    name: formValues.keyName,
    keyType: formValues.keyType as KeyType,
    chainId: formValues.chainId,
    accountType: AccountType.CHAIN,
    cryptoType: isEthereumBased ? CryptoType.ETHEREUM : CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    derivationPath: formValues.derivationPath,
  } as VaultChainAccount;

  if (!formValues.isSharded) return base;

  const groupId = crypto.randomUUID();

  return Array.from(
    { length: Number(formValues.shards) },
    (_, index) =>
      ({
        ...base,
        groupId,
        accountType: AccountType.SHARD,
        derivationPath: `${formValues.derivationPath}//${index}`,
      }) satisfies VaultShardAccount,
  );
});

sample({
  clock: formInitiated,
  fn: (keys) => {
    return accountUtils.getAccountsAndShardGroups(keys as (VaultChainAccount | VaultShardAccount)[]);
  },
  target: $existingKeys,
});

sample({
  clock: formInitiated,
  target: [$constructorForm.reset, formStarted],
});

sample({
  clock: $constructorForm.formValidated,
  source: $chain,
  filter: (chain: Chain | null): chain is Chain => nonNullable(chain),
  fn: (chain, formValues) => ({ chain, formValues }),
  target: addNewKeyFx,
});

sample({
  clock: $constructorForm.formValidated,
  target: $constructorForm.reset,
});

sample({
  clock: $constructorForm.formValidated,
  fn: ({ chainId }) => chainId,
  target: $constructorForm.fields.chainId.onChange,
});

sample({
  clock: addNewKeyFx.doneData,
  source: $keysToAdd,
  fn: (keys, newKeys) => {
    return keys.concat(accountUtils.isAccountWithShards(newKeys) ? [newKeys] : newKeys);
  },
  target: $keysToAdd,
});

sample({
  clock: $isKeyTypeSharded,
  fn: () => ({ isSharded: false, shards: '' }),
  target: spread({
    targets: {
      isSharded: $constructorForm.fields.isSharded.onChange,
      shards: $constructorForm.fields.shards.onChange,
    },
  }),
});

sample({
  clock: $constructorForm.fields.isSharded.onChange,
  filter: (isSharded) => !isSharded,
  target: [$constructorForm.fields.shards.reset],
});

sample({
  clock: $chain,
  source: $constructorForm.fields.keyType.$value,
  filter: (_, chain) => nonNullable(chain),
  fn: (keyType, chain) => {
    const type = keyType === KeyType.MAIN ? '' : `//${keyType}`;

    return `//${chain!.specName}${type}`;
  },
  target: $constructorForm.fields.derivationPath.onChange,
});

sample({
  clock: $constructorForm.fields.keyType.onChange,
  source: {
    chain: $chain,
    isSharded: $constructorForm.fields.isSharded.$value,
  },
  filter: ({ chain }, keyType) => {
    return nonNullable(chain) && nonNullable(keyType);
  },
  fn: ({ chain, isSharded }, keyType) => {
    const type = keyType === KeyType.MAIN ? '' : `//${keyType}`;

    return {
      keyName: isSharded ? SHARDED_KEY_NAMES[keyType!] : KEY_NAMES[keyType!],
      derivationPath: `//${chain!.specName}${type}`,
    };
  },
  target: spread({
    targets: {
      keyName: $constructorForm.fields.keyName.onChange,
      derivationPath: $constructorForm.fields.derivationPath.onChange,
    },
  }),
});

sample({
  clock: $constructorForm.fields.keyType.onChange,
  target: $constructorForm.fields.derivationPath.resetErrors,
});

sample({
  clock: $constructorForm.fields.isSharded.onChange,
  source: $constructorForm.fields.keyType.$value,
  filter: (keyType: KeyType | null): keyType is KeyType => nonNullable(keyType),
  fn: (keyType, isSharded) => {
    return isSharded ? SHARDED_KEY_NAMES[keyType] : KEY_NAMES[keyType];
  },
  target: $constructorForm.fields.keyName.onChange,
});

sample({
  clock: keyRemoved,
  source: {
    keys: $keys,
    keysToAdd: $keysToAdd,
    keysToRemove: $keysToRemove,
    existingKeys: $existingKeys,
  },
  filter: ({ keys }, indexToRemove) => Boolean(keys[indexToRemove]),
  fn: (keysTypes, indexToRemove) => {
    const { keys, keysToAdd, keysToRemove, existingKeys } = keysTypes;

    const keyMatch = keys[indexToRemove];
    const isExistingKey = existingKeys.includes(keyMatch);

    return {
      keysToAdd: isExistingKey ? keysToAdd : keysToAdd.filter((key) => key !== keyMatch),
      keysToRemove: isExistingKey ? [...keysToRemove, keyMatch] : keysToRemove,
    };
  },
  target: spread({
    targets: {
      keysToAdd: $keysToAdd,
      keysToRemove: $keysToRemove,
    },
  }),
});

sample({
  clock: [keyRemoved, $constructorForm.formValidated],
  fn: () => true,
  target: $hasChanged,
});

export const constructorModel = {
  $keys,
  $keysToAdd,
  $keysToRemove,
  $hasKeys,
  $hasChanged,
  $isKeyTypeSharded,
  $derivationEnabled,
  $constructorForm,
  events: {
    formInitiated,
    keyRemoved,
  },
};
