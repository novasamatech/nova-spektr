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
  decodePrefs: (bytes: Uint8Array) => ValidatorPrefs,
): ValidatorPrefsMap {
  return stashes.reduce<ValidatorPrefsMap>((acc, stash, index) => {
    /**
     * The concrete codec of an absent-key value differs between environments: a
     * zero-length `Raw` in some, an empty `StorageData` — whose compact length
     * prefix makes `encodedLength` 1 — from live nodes (measured on Polkadot
     * Asset Hub, 2026-08-11). The bare encoding is the wrapper-independent
     * existence signal. `isEmpty` stays wrong either way: real 0%-commission
     * non-blocked prefs store all-zero bytes (`0x0000`), which polkadot.js also
     * reports as "empty".
     */
    const bytes = values[index]?.toU8a(true);

    acc[stash] = bytes === undefined || bytes.length === 0 ? null : decodePrefs(bytes);

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
 * back-filled from its cache. The wrapper codec of each value is
 * environment-dependent, so existence is read from the bare encoding — see
 * `buildValidatorPrefsMap`.
 */
function subscribeValidatorPrefs(
  api: ApiPromise,
  stashes: AccountId[],
  callback: (prefs: ValidatorPrefsMap) => void,
): Promise<() => void> {
  const storageKeys = stashes.map(stash => api.query.staking.validators.key(stash));
  const valueType = api.registry.createLookupType(api.query.staking.validators.creator.meta.type.asMap.value);

  const decodePrefs = (bytes: Uint8Array) =>
    mapPrefs(stakingValidatorPrefs.parse(api.registry.createType(valueType, bytes)));

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
