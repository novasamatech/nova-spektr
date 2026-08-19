import { createEffect, createEvent, createStore } from 'effector';

import { type ChainId, type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountIdentity } from '@/domains/network';
import { type EraValidatorMap, type ValidatorsResourceParams } from '@/domains/staking';

/**
 * Writable stand-ins for the domain resource caches, which are exposed as
 * read-only stores and therefore cannot be seeded through `fork({ values })`.
 * `model.test.ts` swaps them in with `vi.mock` and seeds them directly - no api
 * is ever touched.
 *
 * Only type imports above, so this module stays outside the mocked modules'
 * runtime graph.
 */
export const $validatorsCache = createStore<Record<ChainId, EraValidatorMap>>({});

export const $identityCache = createStore<Record<ChainId, Record<AccountId, AccountIdentity>>>({});

export const requestIdentitiesFx = createEffect(() => ({}));

/**
 * Callable stand-ins for the validators resource's request lifecycle. The real
 * `fail`/`push` are read-only derivatives of an internal effect, so a test
 * cannot fire them without touching an api - these can be driven directly.
 */
export const validatorsFail = createEvent<{ params: ValidatorsResourceParams; error: Error }>();

export const validatorsPush = createEvent<{ params: ValidatorsResourceParams; result: EraValidatorMap }>();

export const validatorsStart = createEvent<ValidatorsResourceParams>();

export const $validatorsPending = createStore<Record<string, boolean>>({});

export const $eraCache = createStore<Record<ChainId, EraIndex>>({});
