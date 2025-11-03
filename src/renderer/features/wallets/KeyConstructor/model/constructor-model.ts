import { attach, createApi, createEffect, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';
import { nanoid } from 'nanoid';

import {
  type Chain,
  type ChainId,
  type DraftAccount,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { type DerivationError, TokenType, parseDerivation, validateDerivation } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

export const DEFAULT_CHAIN = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

export type DerivationKeyDraft = Pick<VaultShardAccount, 'chainId' | 'derivationPath'> & {
  groupId?: VaultShardAccount['groupId'];
};

export type Callbacks = {
  onConfirm: (keys: DerivationKeyDraft[]) => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
  reset: () => null,
});

const init = createEvent<(DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]>();
const addKey = createEvent();
const removeKey = createEvent<string>();
const updateKey = createEvent<[string, Partial<DerivationKeyDraft>]>();
const validateKey = createEvent<string>();
const submit = createEvent();

const $keys = createStore<Record<string, DerivationKeyDraft>>({});
const $hasChanged = createStore(false).reset(init);
const $errors = createStore<Record<string, DerivationError[]>>({}).reset(init);

function getOtherDerivationPaths(
  keyId: string,
  relayChainId: ChainId,
  isEthereumBased: boolean,
  keys: Record<string, DerivationKeyDraft>,
  chains: Record<ChainId, Chain>,
) {
  return Object.entries(keys)
    .filter(([otherKeyId]) => otherKeyId !== keyId)
    .filter(([, otherKey]) => {
      const otherChain = chains[otherKey.chainId];
      return isEthereumBased
        ? networkUtils.isEthereumBased(otherChain.options)
        : (otherChain.parentId ?? otherChain.chainId) === relayChainId;
    })
    .map(([, otherKey]) => otherKey.derivationPath);
}

function getKeyValidationErrors(
  keyId: string,
  keys: Record<string, DerivationKeyDraft>,
  chains: Record<ChainId, Chain>,
) {
  const { derivationPath, chainId } = keys[keyId];
  const chain = chains[chainId];
  const relayChainId = chain.parentId ?? chain.chainId;
  const isEthereumBased = networkUtils.isEthereumBased(chain.options);

  const otherPaths = getOtherDerivationPaths(keyId, relayChainId, isEthereumBased, keys, chains);
  const { errors } = validateDerivation(derivationPath, { otherPaths, isEthereumBased });

  return errors;
}

function mergeShardedAccounts(
  accounts: (DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[],
): DerivationKeyDraft[] {
  const accountGroups = accountUtils.getAccountsAndShardGroups(accounts as (VaultChainAccount | VaultShardAccount)[]);
  return accountGroups.map((a) => {
    if (Array.isArray(a)) {
      return { chainId: a[0].chainId, derivationPath: accountUtils.getDerivationPath(a), groupId: a[0].groupId };
    }
    return { chainId: a.chainId, derivationPath: a.derivationPath };
  });
}

function expandShardedDerivations(derivations: DerivationKeyDraft[]) {
  return derivations.flatMap((derivation) => {
    const parsed = parseDerivation(derivation.derivationPath);

    if (parsed.shardCount !== undefined && parsed.shardCount >= 2) {
      const groupId = derivation.groupId ?? crypto.randomUUID();
      const expandedKeys: DerivationKeyDraft[] = [];

      for (let i = 0; i < parsed.shardCount; i += 1) {
        const shardPath = parsed.tokens
          .map((t) => (t.type === TokenType.SHARD_RANGE ? i.toString() : t.value))
          .join('');
        expandedKeys.push({ ...derivation, derivationPath: shardPath, groupId });
      }

      return expandedKeys;
    }

    return derivation;
  });
}

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
    hasErrors = hasErrors || validationErrors.length > 0;
  }

  if (hasErrors) {
    throw errors;
  }

  return errors;
});

sample({
  clock: init,
  fn: (existingAccounts) =>
    produce<Record<string, DerivationKeyDraft>>({}, (draft) => {
      const derivationKeys = mergeShardedAccounts(existingAccounts);
      for (const key of derivationKeys) {
        const id = nanoid();

        draft[id] = {
          chainId: key.chainId,
          derivationPath: key.derivationPath,
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
    effect: ({ callbacks, keys }) => {
      const expandedKeys = expandShardedDerivations(Object.values(keys));
      callbacks?.onConfirm(expandedKeys);
    },
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
