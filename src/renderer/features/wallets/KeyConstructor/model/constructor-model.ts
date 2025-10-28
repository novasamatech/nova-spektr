import { attach, createApi, createEffect, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';
import { nanoid } from 'nanoid';

import { type Chain, type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { type DerivationError, validateDerivation } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';

export const DEFAULT_CHAIN = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

export type DerivationKeyDraft = Pick<VaultChainAccount, 'chainId' | 'derivationPath'>;

export type Callbacks = {
  onConfirm: (keys: DerivationKeyDraft[]) => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
  reset: () => null,
});

const init = createEvent<(VaultChainAccount | VaultShardAccount)[]>();
const addKey = createEvent();
const removeKey = createEvent<string>();
const updateKey = createEvent<[string, Partial<DerivationKeyDraft>]>();
const validateKey = createEvent<string>();
const submit = createEvent();

const $keys = createStore<Record<string, DerivationKeyDraft>>({});
const $hasChanged = createStore(false).reset(init);
const $errors = createStore<Record<string, DerivationError[]>>({}).reset(init);

const getKeyValidationErrors = (
  keyId: string,
  keys: Record<string, DerivationKeyDraft>,
  chains: Record<ChainId, Chain>,
): DerivationError[] => {
  const { derivationPath, chainId } = keys[keyId];
  const chain = chains[chainId];
  const isEthereumBased = networkUtils.isEthereumBased(chain.options);
  const relayChainId = chain.parentId ?? chain.chainId;

  const relatedPaths: string[] = [];
  for (const [otherKeyId, otherKey] of Object.entries(keys)) {
    if (otherKeyId === keyId) continue;
    const otherChain = chains[otherKey.chainId];
    const shouldInclude = isEthereumBased
      ? networkUtils.isEthereumBased(otherChain.options)
      : (otherChain.parentId ?? otherChain.chainId) === relayChainId;
    if (shouldInclude) {
      relatedPaths.push(otherKey.derivationPath);
    }
  }

  return validateDerivation(derivationPath, { otherPaths: relatedPaths, isEthereum: isEthereumBased });
};

const submitFx = createEffect<
  { keys: Record<string, DerivationKeyDraft>; chains: Record<ChainId, Chain> },
  Record<string, DerivationError[]>,
  Record<string, DerivationError[]>
>(({ keys, chains }) => {
  const errors: Record<string, DerivationError[]> = {};
  let hasErrors = false;

  for (const keyId of Object.keys(keys)) {
    const validationErrors = getKeyValidationErrors(keyId, keys, chains);
    errors[keyId] = validationErrors;
    if (validationErrors.length > 0) {
      hasErrors = true;
    }
  }

  if (hasErrors) {
    throw errors;
  }

  return errors;
});

sample({
  clock: init,
  fn: (existingKeys) =>
    produce<Record<string, DerivationKeyDraft>>({}, (draft) => {
      for (const existingKey of existingKeys) {
        const id = nanoid();

        draft[id] = {
          chainId: existingKey.chainId,
          derivationPath: existingKey.derivationPath,
        };
      }
    }),
  target: $keys,
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
  source: { errors: $errors, keys: $keys, chains: networkModel.$chains },
  fn: ({ errors, keys, chains }, keyId) =>
    produce(errors, (draft) => {
      draft[keyId] = getKeyValidationErrors(keyId, keys, chains);
    }),
  target: $errors,
});

sample({
  clock: submit,
  source: { keys: $keys, chains: networkModel.$chains },
  target: submitFx,
});

sample({
  clock: submitFx.doneData,
  target: attach({
    source: { callbacks: $callbacks, keys: $keys },
    effect: ({ callbacks, keys }) => callbacks?.onConfirm(Object.values(keys)),
  }),
});

sample({
  clock: [submitFx.doneData, submitFx.failData],
  target: $errors,
});

export const constructorModel = {
  init,
  addKey,
  removeKey,
  updateKey,
  validateKey,
  submit,
  callbacksApi,

  $keys,
  $hasChanged,
  $errors,
};
