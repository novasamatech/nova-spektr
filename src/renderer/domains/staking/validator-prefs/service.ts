import { type ApiPromise } from '@polkadot/api';
import { type StorageChangeSet } from '@polkadot/types/interfaces';

import { type StakingValidatorPrefs, stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { perbillToPercent } from '../apy/calculator';

import { type ValidatorPrefs, type ValidatorPrefsMap } from './types';

const { stakingValidatorPrefs } = stakingPallet.schema;

function mapPrefs(prefs: StakingValidatorPrefs): ValidatorPrefs {
  return { commission: perbillToPercent(prefs.commission), blocked: prefs.blocked };
}

/**
 * `staking.validators` is a `ValueQuery` map: `api.query...multi` decodes a
 * missing key as default prefs `{ commission: 0, blocked: false }` — exactly
 * what a real 0%-commission validator stores, so existence is the only signal
 * that separates "validator" from "not a validator". The raw storage
 * subscription is the one read that answers with `Option` per key.
 *
 * `state_subscribeStorage` sends every requested key in the first change set
 * and only the changed ones afterwards, so the running map lives in the closure
 * and every emission re-publishes the whole map.
 */
function subscribeValidatorPrefs(
  api: ApiPromise,
  stashes: AccountId[],
  callback: (prefs: ValidatorPrefsMap) => void,
): Promise<() => void> {
  const storageKeys = stashes.map(stash => api.query.staking.validators.key(stash));
  const stashByKey = new Map(storageKeys.map((key, index) => [key, stashes[index]]));
  const valueType = api.registry.createLookupType(api.query.staking.validators.creator.meta.type.asMap.value);

  const current: ValidatorPrefsMap = {};

  return api.rpc.state.subscribeStorage<StorageChangeSet>(storageKeys, changeSet => {
    try {
      for (const [storageKey, value] of changeSet.changes) {
        const stash = stashByKey.get(storageKey.toHex());
        if (!stash) continue;

        current[stash] = value.isSome
          ? mapPrefs(stakingValidatorPrefs.parse(api.registry.createType(valueType, value.unwrap().toU8a(true))))
          : null;
      }

      callback({ ...current });
    } catch (error) {
      console.warn(error);
      callback({});
    }
  });
}

export const validatorPrefsService = {
  mapPrefs,
  subscribeValidatorPrefs,
};
