import { createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';
import { nanoid } from 'nanoid';

import { type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { type DerivationError, validateDerivation } from '@/shared/lib/utils';

export const DEFAULT_CHAIN = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

export type DerivationKeyDraft = Pick<VaultChainAccount, 'chainId' | 'derivationPath'>;

const init = createEvent<(VaultChainAccount | VaultShardAccount)[]>();
const addKey = createEvent();
const removeKey = createEvent<string>();
const updateKey = createEvent<[string, Partial<DerivationKeyDraft>]>();
const validateKey = createEvent<string>();

const $hasChanged = createStore(false).reset(init);
const $errors = createStore<Record<string, DerivationError[]>>({}).reset(init);

const $keys = createStore<Record<string, DerivationKeyDraft>>({}).on(init, (_, existingKeys) => {
  return produce<Record<string, DerivationKeyDraft>>({}, (draft) => {
    for (const existingKey of existingKeys) {
      const id = nanoid();

      draft[id] = {
        chainId: existingKey.chainId,
        derivationPath: existingKey.derivationPath,
      };
    }
  });
});

sample({
  clock: addKey,
  source: { keys: $keys },
  fn: ({ keys }) =>
    produce(keys, (draft) => {
      const id = nanoid();

      draft[id] = {
        chainId: DEFAULT_CHAIN,
        derivationPath: '',
      };
    }),
  target: $keys,
});

sample({
  clock: removeKey,
  source: { keys: $keys },
  fn: ({ keys }, id) => {
    return produce(keys, (draft) => {
      delete draft[id];
    });
  },
  target: $keys,
});

sample({
  clock: updateKey,
  source: { keys: $keys },
  fn: ({ keys }, [id, patch]) => {
    return produce(keys, (draft) => {
      Object.assign(draft[id], patch);
    });
  },
  target: $keys,
});

sample({
  clock: [addKey, removeKey, updateKey],
  fn: () => true,
  target: $hasChanged,
});

sample({
  clock: validateKey,
  source: { errors: $errors, keys: $keys },
  fn: ({ errors, keys }, id) => {
    const { derivationPath, chainId } = keys[id];
    const existingPaths = Object.entries(keys)
      .filter(([keyId, keyData]) => keyId !== id && keyData.chainId === chainId)
      .map(([_, key]) => key.derivationPath);

    return produce(errors, (draft) => {
      draft[id] = validateDerivation(derivationPath, existingPaths);
    });
  },
  target: $errors,
});

export const constructorModel = {
  init,
  addKey,
  removeKey,
  updateKey,
  validateKey,

  $keys,
  $hasChanged,
  $errors,
};
