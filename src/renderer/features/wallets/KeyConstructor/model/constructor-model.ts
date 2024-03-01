import { createForm } from 'effector-forms';
import { createStore, createEvent, sample, combine, createEffect } from 'effector';
import { spread } from 'patronum';

import { networkModel, networkUtils } from '@entities/network';
import type { ChainAccount, ShardAccount, Chain } from '@shared/core';
import { KeyType, AccountType, CryptoType, ChainType } from '@shared/core';
import { validateDerivation, derivationHasPassword } from '@shared/lib/utils';
import { accountUtils, KEY_NAMES, SHARDED_KEY_NAMES } from '@entities/wallet';

const formInitiated = createEvent<Array<ChainAccount | ShardAccount>>();
const formStarted = createEvent();
const focusableSet = createEvent<HTMLButtonElement>();
const keyRemoved = createEvent<number>();

const $existingKeys = createStore<Array<ChainAccount | ShardAccount[]>>([]);
const $keysToAdd = createStore<Array<ChainAccount | ShardAccount[]>>([]).reset(formStarted);
const $keysToRemove = createStore<Array<ChainAccount | ShardAccount[]>>([]).reset(formStarted);

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
          errorText: 'dynamicDerivations.constructor.numberRequiredError',
          validator: (value, { isSharded }): boolean => !isSharded || Boolean(value),
        },
        {
          name: 'NaN',
          errorText: 'dynamicDerivations.constructor.notNumberError',
          validator: (value, { isSharded }): boolean => !isSharded || !Number.isNaN(Number(value)),
        },
        {
          name: 'maxAmount',
          errorText: 'dynamicDerivations.constructor.maxShardsError',
          validator: (value, { isSharded }): boolean => !isSharded || Number(value) <= 50,
        },
        {
          name: 'minAmount',
          errorText: 'dynamicDerivations.constructor.minShardsError',
          validator: (value, { isSharded }): boolean => !isSharded || Number(value) >= 2,
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
          validator: (value, { keyType }): boolean => keyType !== KeyType.CUSTOM || Boolean(value),
        },
        {
          name: 'hasPassword',
          errorText: 'dynamicDerivations.constructor.passwordDerivationError',
          validator: (value): boolean => !derivationHasPassword(value),
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
          validator: (value, { network }, keys: Array<ChainAccount | ShardAccount[]>): boolean => {
            return keys.every((key) => {
              const keyToCheck = Array.isArray(key) ? key[0] : key;

              return keyToCheck.chainId !== network.chainId || !keyToCheck.derivationPath.includes(value);
            });
          },
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const $hasChanged = createStore<boolean>(false).reset(formStarted);
const $elementToFocus = createStore<HTMLButtonElement | null>(null);

const $isKeyTypeSharded = combine($constructorForm.fields.keyType.$value, (keyType): boolean => {
  return keyType === KeyType.CUSTOM;
});

const $derivationEnabled = combine($constructorForm.fields.keyType.$value, (keyType): boolean => {
  return keyType === KeyType.CUSTOM;
});

const $hasKeys = combine($keys, (keys) => Boolean(keys.length));

const focusElementFx = createEffect((element: HTMLButtonElement) => {
  element.focus();
});

const addNewKeyFx = createEffect((formValues: FormValues): ChainAccount | ShardAccount[] => {
  const isEthereumBased = networkUtils.isEthereumBased(formValues.network.options);

  const base = {
    name: formValues.keyName,
    keyType: formValues.keyType,
    chainId: formValues.network.chainId,
    type: AccountType.CHAIN,
    cryptoType: isEthereumBased ? CryptoType.ETHEREUM : CryptoType.SR25519,
    chainType: isEthereumBased ? ChainType.ETHEREUM : ChainType.SUBSTRATE,
    derivationPath: formValues.derivationPath,
  };

  if (!formValues.isSharded) return base as ChainAccount;

  const groupId = crypto.randomUUID();

  return Array.from(
    { length: Number(formValues.shards) },
    (_, index) =>
      ({
        ...base,
        groupId,
        type: AccountType.SHARD,
        derivationPath: `${formValues.derivationPath}//${index}`,
      } as ShardAccount),
  );
});

sample({
  clock: formInitiated,
  fn: (keys) => {
    return accountUtils.getAccountsAndShardGroups(keys as Array<ChainAccount | ShardAccount>);
  },
  target: $existingKeys,
});

sample({
  clock: formInitiated,
  target: [$constructorForm.reset, formStarted],
});

sample({
  clock: formStarted,
  source: networkModel.$chains,
  fn: (chains) => Object.values(chains)[0],
  target: $constructorForm.fields.network.onChange,
});

sample({
  clock: focusableSet,
  target: $elementToFocus,
});

sample({
  clock: $constructorForm.formValidated,
  target: [addNewKeyFx, $constructorForm.reset],
});

sample({
  clock: $constructorForm.formValidated,
  fn: ({ network }) => network,
  target: $constructorForm.fields.network.onChange,
});

sample({
  clock: $constructorForm.formValidated,
  source: $elementToFocus,
  filter: (element): element is HTMLButtonElement => Boolean(element),
  target: focusElementFx,
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
  clock: $constructorForm.fields.network.onChange,
  source: $constructorForm.fields.keyType.$value,
  filter: (keyType) => Boolean(keyType),
  fn: (keyType, chain) => {
    const type = keyType === KeyType.MAIN ? '' : `//${keyType}`;

    return `//${chain.specName}${type}`;
  },
  target: $constructorForm.fields.derivationPath.onChange,
});

sample({
  clock: $constructorForm.fields.keyType.onChange,
  source: {
    chain: $constructorForm.fields.network.$value,
    isSharded: $constructorForm.fields.isSharded.$value,
  },
  fn: ({ chain, isSharded }, keyType) => {
    const type = keyType === KeyType.MAIN ? '' : `//${keyType}`;

    return {
      keyName: isSharded ? SHARDED_KEY_NAMES[keyType] : KEY_NAMES[keyType],
      derivationPath: `//${chain.specName}${type}`,
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
    focusableSet,
  },
};
