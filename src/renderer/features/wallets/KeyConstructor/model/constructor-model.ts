import { attach, combine, createApi, createEffect, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';
import { nanoid } from 'nanoid';

import {
  type Chain,
  type ChainId,
  type DraftAccount,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { DerivationError, TokenType, nullable, parseDerivation, validateDerivation } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

export const DEFAULT_CHAIN = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f'; // Polkadot AH

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

/** Keys the user has finished editing. A key not in here is still being typed. */
const $touched = createStore<Record<string, boolean>>({}).reset(init);

function getOtherDerivationPaths(keyId: string, chainId: ChainId, keys: Record<string, DerivationKeyDraft>) {
  return Object.entries(keys)
    .filter(([otherKeyId, otherKey]) => otherKeyId !== keyId && otherKey.chainId === chainId)
    .map(([, otherKey]) => otherKey.derivationPath);
}

function getKeyValidationErrors(
  keyId: string,
  keys: Record<string, DerivationKeyDraft>,
  chains: Record<ChainId, Chain>,
) {
  const key = keys[keyId];
  if (nullable(key)) return [];

  const { derivationPath, chainId } = key;
  const chain = chains[chainId];
  if (nullable(chain)) return [];

  const isEthereumBased = networkUtils.isEthereumBased(chain.options);

  const otherPaths = getOtherDerivationPaths(keyId, chainId, keys);
  const { errors } = validateDerivation(derivationPath, { otherPaths, isEthereumBased });

  return errors;
}

const $errors = combine(
  { keys: $keys, touched: $touched, chains: networkModel.$chains },
  ({ keys, touched, chains }) => {
    const errors: Record<string, DerivationError[]> = {};

    for (const keyId of Object.keys(keys)) {
      const keyErrors = getKeyValidationErrors(keyId, keys, chains);

      if (touched[keyId]) {
        errors[keyId] = keyErrors;
      } else if (keyErrors.includes(DerivationError.DUPLICATE)) {
        // A collision is symmetric: flag both keys, not just the one that got blurred
        // first. Other errors stay hidden until the user is done typing the key.
        errors[keyId] = [DerivationError.DUPLICATE];
      }
    }

    return errors;
  },
);

function mergeShardedAccounts(
  accounts: (DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[],
): DerivationKeyDraft[] {
  const accountGroups = accountUtils.getAccountsAndShardGroups(accounts as (VaultChainAccount | VaultShardAccount)[]);
  return accountGroups.flatMap((a) => {
    if (Array.isArray(a)) {
      const first = a[0];
      if (nullable(first)) return [];
      return [{ chainId: first.chainId, derivationPath: accountUtils.getDerivationPath(a), groupId: first.groupId }];
    }
    return [{ chainId: a.chainId, derivationPath: a.derivationPath }];
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
          groupId: key.groupId,
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
      const target = draft[id];
      if (!nullable(target)) Object.assign(target, patch);
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
  source: $touched,
  fn: (touched, keyId) => ({ ...touched, [keyId]: true }),
  target: $touched,
});

// Submitting surfaces every error, not only those on keys the user visited.
sample({
  clock: submit,
  source: $keys,
  fn: (keys) => Object.fromEntries(Object.keys(keys).map((keyId) => [keyId, true])),
  target: $touched,
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
