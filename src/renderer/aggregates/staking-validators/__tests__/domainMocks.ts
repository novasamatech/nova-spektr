import { createEffect, createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountIdentity } from '@/domains/network';
import { type EraValidatorMap } from '@/domains/staking';

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
