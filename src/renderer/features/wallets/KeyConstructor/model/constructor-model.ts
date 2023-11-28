import { createForm } from 'effector-forms';
import { createStore, createEvent, sample, combine, forward, createEffect } from 'effector';
import { spread } from 'patronum';

import { chainsService } from '@entities/network';
import { KeyType, AccountType, CryptoType, ChainType, DraftAccount } from '@shared/core';
import { validateDerivation, derivationHasPassword } from '@shared/lib/utils';
import type { ChainAccount, ShardAccount, Chain } from '@shared/core';
import { accountUtils } from '@entities/wallet';

const KEY_NAMES = {
  [KeyType.MAIN]: 'Main',
  [KeyType.HOT]: 'Hot wallet account',
  [KeyType.PUBLIC]: 'Pub account',
  [KeyType.STAKING]: 'Staking',
  [KeyType.GOVERNANCE]: 'Governance',
  [KeyType.CUSTOM]: '',
};

const SHARDED_KEY_NAMES = {
  [KeyType.MAIN]: 'Main sharded',
  [KeyType.HOT]: '',
  [KeyType.PUBLIC]: '',
  [KeyType.STAKING]: 'Staking sharded',
  [KeyType.GOVERNANCE]: 'Governance sharded',
  [KeyType.CUSTOM]: '',
};

const chains = chainsService.getChainsData({ sort: true });

const formInitiated = createEvent<DraftAccount<ChainAccount | ShardAccount>[]>();
const formStarted = createEvent();
const focusableSet = createEvent<HTMLButtonElement>();
const keyRemoved = createEvent<number>();

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

const $hasChanged = createStore<boolean>(false).reset(formStarted);
const $elementToFocus = createStore<HTMLButtonElement | null>(null);

const $shardedEnabled = combine($constructorForm.fields.keyType.$value, (keyType) => {
  return [KeyType.MAIN, KeyType.STAKING, KeyType.GOVERNANCE, KeyType.CUSTOM].includes(keyType);
});

const $derivationEnabled = combine($constructorForm.fields.keyType.$value, (keyType) => {
  return keyType === KeyType.CUSTOM;
});

const $hasKeys = combine($keys, (keys) => {
  return keys.some((key) => {
    const keyData = Array.isArray(key) ? key[0] : key;

    return keyData.keyType !== KeyType.MAIN;
  });
});

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
  fn: (keys) => {
    return accountUtils.getAccountsAndShardGroups(keys as Array<ChainAccount | ShardAccount>);
  },
  target: $keys,
});

forward({ from: formInitiated, to: [$constructorForm.reset, formStarted] });

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
  clock: $constructorForm.fields.network.onChange,
  source: $constructorForm.fields.keyType.$value,
  filter: (keyType) => Boolean(keyType),
  fn: (keyType, chain) => {
    const type = keyType === KeyType.MAIN ? '' : `//${keyType}`;

    return `//${chain.specName}${type}`;
  },
  target: $constructorForm.fields.derivationPath.$value,
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
  clock: $constructorForm.fields.isSharded.onChange,
  source: $constructorForm.fields.keyType.$value,
  fn: (keyType, isSharded) => {
    return isSharded ? SHARDED_KEY_NAMES[keyType] : KEY_NAMES[keyType];
  },
  target: $constructorForm.fields.keyName.$value,
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
  $hasKeys,
  $hasChanged,
  $shardedEnabled,
  $derivationEnabled,
  $constructorForm,
  events: {
    formInitiated,
    keyRemoved,
    focusableSet,
  },
};
