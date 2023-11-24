import { createForm } from 'effector-forms';
import { createStore, createEvent, sample, combine, forward, createEffect } from 'effector';
import { spread } from 'patronum';

import type { ChainAccount, ShardAccount, Chain } from '@shared/core';
import { KeyType, AccountType, CryptoType, ChainType } from '@shared/core';
import { chainsService } from '@entities/network';
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

const $keys = createStore<Array<ChainAccount | ShardAccount[]>>([]);

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
          name: 'maxAmount',
          errorText: 'Max 50',
          validator: (value, { isSharded }): boolean => !isSharded || Number(value) <= 50,
        },
        {
          name: 'minAmount',
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
          name: 'hasPassword',
          errorText: 'Password derivation path is not allowed',
          validator: (value): boolean => !/\/\/\//g.test(value),
        },
        {
          name: 'badFormat',
          errorText: 'Wrong derivation path format',
          validator: validateDerivation,
        },
        {
          name: 'duplicated',
          source: $keys,
          errorText: 'Duplicated derivation path',
          validator: (value, _, keys: Array<ChainAccount | ShardAccount[]>): boolean => {
            return keys.every((key) => {
              const keyToCheck = Array.isArray(key) ? key[0] : key;

              return !keyToCheck.derivationPath.includes(value);
            });
          },
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const $hasChanged = createStore<boolean>(false);
const $elementToFocus = createStore<HTMLButtonElement | null>(null);

const $shardedEnabled = combine($constructorForm.fields.keyType.$value, (keyType) => {
  return [KeyType.MAIN, KeyType.STAKING, KeyType.GOVERNANCE, KeyType.CUSTOM].includes(keyType);
});

const $derivationEnabled = combine($constructorForm.fields.keyType.$value, (keyType) => {
  return keyType === KeyType.CUSTOM;
});

const formInitiated = createEvent<Array<ChainAccount | ShardAccount[]>>();
const formStarted = createEvent();
const focusableSet = createEvent<HTMLButtonElement>();
const keyRemoved = createEvent<number>();

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
  target: [$keys, formStarted],
});

sample({
  clock: formStarted,
  fn: () => chains[0],
  target: $constructorForm.fields.network.$value,
});

forward({ from: focusableSet, to: $elementToFocus });

sample({
  clock: $constructorForm.formValidated,
  target: [addNewKeyFx, $constructorForm.reset, formStarted],
});

sample({
  clock: $constructorForm.formValidated,
  source: $elementToFocus,
  filter: (element): element is HTMLButtonElement => Boolean(element),
  target: focusElementFx,
});

sample({
  clock: addNewKeyFx.doneData,
  source: $keys,
  fn: (keys, newKeys) => {
    return keys.concat(Array.isArray(newKeys) ? [newKeys] : newKeys);
  },
  target: $keys,
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

sample({
  clock: $constructorForm.fields.keyType.onChange,
  source: $constructorForm.fields.network.$value,
  fn: (chain, keyType) => {
    const type = keyType === KeyType.MAIN ? '' : `//${keyType}`;

    return {
      keyName: KEY_NAMES[keyType],
      derivationPath: `//${chain.specName}${type}`,
    };
  },
  target: spread({
    targets: {
      keyName: $constructorForm.fields.keyName.$value,
      derivationPath: $constructorForm.fields.derivationPath.$value,
    },
  }),
});

forward({
  from: $constructorForm.fields.keyType.onChange,
  to: $constructorForm.fields.derivationPath.resetErrors,
});

sample({
  clock: keyRemoved,
  source: $keys,
  fn: (keys, indexToRemove) => {
    return keys.filter((_, index) => index !== indexToRemove);
  },
  target: $keys,
});

sample({
  clock: [keyRemoved, $constructorForm.formValidated],
  fn: () => true,
  target: $hasChanged,
});

export const constructorModel = {
  $keys,
  $hasChanged,
  $shardedEnabled,
  $derivationEnabled,
  $constructorForm,
  events: {
    formInitiated,
    formStarted,
    keyRemoved,
    focusableSet,
  },
};
