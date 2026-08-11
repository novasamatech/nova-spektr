import { type ApiPromise } from '@polkadot/api';
import { type Codec } from '@polkadot/types/types';

import { type StakingValidatorPrefs, stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { perbillToPercent } from '../apy/calculator';

import { type ValidatorPrefs, type ValidatorPrefsMap } from './types';

const { stakingValidatorPrefs } = stakingPallet.schema;

function mapPrefs(prefs: StakingValidatorPrefs): ValidatorPrefs {
  return { commission: perbillToPercent(prefs.commission), blocked: prefs.blocked };
}

function buildValidatorPrefsMap(
  stashes: AccountId[],
  values: Codec[],
  decodePrefs: (value: Codec) => ValidatorPrefs,
): ValidatorPrefsMap {
  return stashes.reduce<ValidatorPrefsMap>((acc, stash, index) => {
    const value = values[index];

    /**
     * Zero length — not `isEmpty` — is the existence signal: polkadot.js
     * `Raw.isEmpty` is also true for all-zero bytes, and a real 0%-commission
     * non-blocked validator stores exactly `0x0000`.
     */
    acc[stash] = value === undefined || value.encodedLength === 0 ? null : decodePrefs(value);

    return acc;
  }, {});
}

/**
 * `staking.validators` is a `ValueQuery` map: `api.query...multi` decodes a
 * missing key as default prefs `{ commission: 0, blocked: false }` — exactly
 * what a real 0%-commission validator stores, so existence is the only signal
 * that separates "validator" from "not a validator". The raw storage
 * subscription is the one read that answers per key whether the entry exists.
 *
 * Rpc-core intercepts `state_subscribeStorage`: each emission arrives as a full
 * value set positionally aligned with the requested keys, unchanged keys
 * back-filled from its cache. Plain hex keys decode as `Raw`, and an absent key
 * arrives as a zero-length `Raw`.
 */
function subscribeValidatorPrefs(
  api: ApiPromise,
  stashes: AccountId[],
  callback: (prefs: ValidatorPrefsMap) => void,
): Promise<() => void> {
  const storageKeys = stashes.map(stash => api.query.staking.validators.key(stash));
  const valueType = api.registry.createLookupType(api.query.staking.validators.creator.meta.type.asMap.value);

  const decodePrefs = (value: Codec) =>
    mapPrefs(stakingValidatorPrefs.parse(api.registry.createType(valueType, value.toU8a())));

  return api.rpc.state.subscribeStorage<Codec[]>(storageKeys, values => {
    try {
      callback(buildValidatorPrefsMap(stashes, values, decodePrefs));
    } catch (error) {
      console.warn(error);
      callback({});
    }
  });
}

export const validatorPrefsService = {
  buildValidatorPrefsMap,
  mapPrefs,
  subscribeValidatorPrefs,
};
