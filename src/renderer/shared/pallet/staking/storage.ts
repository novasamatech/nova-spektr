import { type ApiPromise } from '@polkadot/api';
import { zipWith } from 'lodash';
import { z } from 'zod';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';

import {
  stakingActiveEraInfo,
  stakingEraRewardPoints,
  stakingExposurePage,
  stakingLedger,
  stakingNominations,
  stakingPagedExposureMetadata,
  stakingRewardDestination,
  stakingSlashingSpans,
  stakingUnappliedSlash,
  stakingValidatorPrefs,
} from './schema';

const getPallet = (api: ApiPromise) => {
  const pallet = api.query['staking'];
  if (!pallet) {
    throw new TypeError(`staking pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  return pallet;
};

const getQuery = (api: ApiPromise, name: string) => {
  const query = getPallet(api)[name];

  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const storage = {
  /**
   * The active era information, it holds index and start.
   *
   * The active era is the era being currently rewarded. Validator set of this
   * era must be equal to `SessionInterface::validators`.
   */
  activeEra(api: ApiPromise) {
    const schema = pjsSchema.optional(stakingActiveEraInfo);

    return substrateRpcPool.call(() => getQuery(api, 'activeEra')()).then(schema.parse);
  },

  /**
   * The current era index.
   *
   * This is the latest planned era, depending on how the Session pallet queues
   * the validator set, it might be active or not.
   */
  currentEra(api: ApiPromise) {
    const schema = pjsSchema.optional(pjsSchema.u32);

    return substrateRpcPool.call(() => getQuery(api, 'currentEra')()).then(schema.parse);
  },

  /**
   * The total amount staked for the last `HistoryDepth` eras.
   */
  erasTotalStake(api: ApiPromise, era: number) {
    return substrateRpcPool.call(() => getQuery(api, 'erasTotalStake')(era)).then(pjsSchema.u128.parse);
  },

  /**
   * The total validator era payout for the last `HistoryDepth` eras.
   */
  erasValidatorReward(api: ApiPromise, eras: number[]) {
    const schema = pjsSchema.vec(pjsSchema.optional(pjsSchema.u128));

    return substrateRpcPool
      .call(() => getQuery(api, 'erasValidatorReward').multi(eras))
      .then(schema.parse)
      .then(rewards => zipWith(eras, rewards, (era, reward) => ({ era, reward })));
  },

  /**
   * Rewards for the last `HistoryDepth` eras.
   */
  erasRewardPoints(api: ApiPromise, era: number) {
    return substrateRpcPool.call(() => getQuery(api, 'erasRewardPoints')(era)).then(stakingEraRewardPoints.parse);
  },

  /**
   * Summary of validator exposure at a given era.
   */
  erasStakersOverview(api: ApiPromise, era: number) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['validator', pjsSchema.storageKey(pjsSchema.u32, pjsSchema.accountId).transform(keys => keys[1])],
        ['overview', pjsSchema.optional(stakingPagedExposureMetadata)],
      ),
    );

    return substrateRpcPool
      .call(() => getQuery(api, 'erasStakersOverview').entries(era))
      .then(schema.parse)
      .then(items => items.flatMap(({ validator, overview }) => (overview ? [{ validator, overview }] : [])));
  },

  /**
   * Paginated exposure of a validator at given era.
   */
  erasStakersPaged(api: ApiPromise, era: number, validator: AccountId) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['page', pjsSchema.storageKey(pjsSchema.u32, pjsSchema.accountId, pjsSchema.u32).transform(keys => keys[2])],
        ['exposure', pjsSchema.optional(stakingExposurePage)],
      ),
    );

    return substrateRpcPool
      .call(() => getQuery(api, 'erasStakersPaged').entries(era, validator))
      .then(schema.parse)
      .then(items => items.flatMap(({ page, exposure }) => (exposure ? [{ page, exposure }] : [])));
  },

  /**
   * Similar to `ErasStakers`, this holds the preferences of validators.
   */
  erasValidatorPrefs(api: ApiPromise, era: number) {
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['validator', pjsSchema.storageKey(pjsSchema.u32, pjsSchema.accountId).transform(keys => keys[1])],
        ['prefs', stakingValidatorPrefs],
      ),
    );

    return substrateRpcPool.call(() => getQuery(api, 'erasValidatorPrefs').entries(era)).then(schema.parse);
  },

  /**
   * Preferences of the given `(era, validator)` pairs.
   *
   * Unlike `erasValidatorPrefs`, reads exact keys instead of walking the whole
   * era — use it when the interesting validators are already known.
   */
  erasValidatorPrefsFor(api: ApiPromise, keys: { era: number; validator: AccountId }[]) {
    const schema = pjsSchema.vec(stakingValidatorPrefs);

    return substrateRpcPool
      .call(() => getQuery(api, 'erasValidatorPrefs').multi(keys.map(({ era, validator }) => [era, validator])))
      .then(schema.parse)
      .then(response => zipWith(keys, response, ({ era, validator }, prefs) => ({ era, validator, prefs })));
  },

  /**
   * The map from (wannabe) validator stash key to the preferences of that
   * validator.
   */
  validators(api: ApiPromise, accounts: AccountId[]) {
    const schema = pjsSchema.vec(stakingValidatorPrefs);

    return substrateRpcPool
      .call(() => getQuery(api, 'validators').multi(accounts))
      .then(schema.parse)
      .then(response => zipWith(accounts, response, (account, prefs) => ({ account, prefs })));
  },

  /**
   * The map from nominator stash key to their nomination preferences, namely
   * the validators that they wish to support.
   */
  nominators(api: ApiPromise, stashes: AccountId[]) {
    const schema = pjsSchema.vec(pjsSchema.optional(stakingNominations));

    return substrateRpcPool
      .call(() => getQuery(api, 'nominators').multi(stashes))
      .then(schema.parse)
      .then(response => zipWith(stashes, response, (stash, nominations) => ({ stash, nominations })));
  },

  /**
   * Map from all locked "stash" accounts to the controller account.
   */
  bonded(api: ApiPromise, stashes: AccountId[]) {
    const schema = pjsSchema.vec(pjsSchema.optional(pjsSchema.accountId));

    return substrateRpcPool
      .call(() => getQuery(api, 'bonded').multi(stashes))
      .then(schema.parse)
      .then(response => zipWith(stashes, response, (stash, controller) => ({ stash, controller })));
  },

  /**
   * Map from all (unlocked) "controller" accounts to the info regarding the
   * staking.
   */
  ledger(api: ApiPromise, controllers: AccountId[]) {
    const schema = pjsSchema.vec(pjsSchema.optional(stakingLedger));

    return substrateRpcPool
      .call(() => getQuery(api, 'ledger').multi(controllers))
      .then(schema.parse)
      .then(response => zipWith(controllers, response, (controller, ledger) => ({ controller, ledger })));
  },

  /**
   * Where the reward payment should be made. Keyed by stash.
   *
   * `OptionQuery` on recent runtimes, `ValueQuery` on older ones.
   */
  payee(api: ApiPromise, stashes: AccountId[]) {
    const schema = pjsSchema.vec(z.union([pjsSchema.optional(stakingRewardDestination), stakingRewardDestination]));

    return substrateRpcPool
      .call(() => getQuery(api, 'payee').multi(stashes))
      .then(schema.parse)
      .then(response => zipWith(stashes, response, (stash, payee) => ({ stash, payee })));
  },

  /**
   * The minimum active bond to become and maintain the role of a nominator.
   */
  minNominatorBond(api: ApiPromise) {
    return substrateRpcPool.call(() => getQuery(api, 'minNominatorBond')()).then(pjsSchema.u128.parse);
  },

  /**
   * History of claimed paged rewards by era and validator.
   */
  claimedRewards(api: ApiPromise, keys: { era: number; validator: AccountId }[]) {
    const schema = pjsSchema.vec(pjsSchema.vec(pjsSchema.u32));

    return substrateRpcPool
      .call(() => getQuery(api, 'claimedRewards').multi(keys.map(({ era, validator }) => [era, validator])))
      .then(schema.parse)
      .then(response => zipWith(keys, response, ({ era, validator }, pages) => ({ era, validator, pages })));
  },

  /**
   * Validators, that got slashed in a given era.
   *
   * The storage has two shapes:
   *
   * - Staking-async runtimes: double map `(era, (validator, Perbill, u32))` —
   *   validators are read from the second storage key;
   * - Classic runtimes: map `era → Vec<UnappliedSlash>` — validators are read
   *   from the value.
   */
  unappliedSlashKeys(api: ApiPromise, era: number): Promise<AccountId[]> {
    const query = getQuery(api, 'unappliedSlashes');
    const type = query.creator.meta.type;
    const isDoubleMap = type.isMap && type.asMap.hashers.length > 1;

    if (isDoubleMap) {
      const schema = pjsSchema.vec(
        pjsSchema.storageKey(
          pjsSchema.u32,
          pjsSchema.codecTuple(pjsSchema.accountId, pjsSchema.perbill, pjsSchema.u32),
        ),
      );

      return substrateRpcPool
        .call(() => query.keys(era))
        .then(schema.parse)
        .then(keys => keys.map(([, slashKey]) => slashKey[0]));
    }

    const schema = pjsSchema.vec(stakingUnappliedSlash);

    return substrateRpcPool
      .call(() => query(era))
      .then(schema.parse)
      .then(slashes => slashes.map(slash => slash.validator));
  },

  /**
   * Slashing spans for stash accounts.
   *
   * Present on classic `pallet_staking` only — staking-async dropped it, and
   * `null` is returned there so callers can fall back to `unappliedSlashKeys`.
   */
  slashingSpans(api: ApiPromise, validators: AccountId[]) {
    const query = getPallet(api)['slashingSpans'];
    if (!query) {
      return Promise.resolve(null);
    }

    const schema = pjsSchema.vec(pjsSchema.optional(stakingSlashingSpans));

    return substrateRpcPool
      .call(() => query.multi(validators))
      .then(schema.parse)
      .then(response => zipWith(validators, response, (validator, spans) => ({ validator, spans })));
  },

  /**
   * A mapping from still-bonded eras to the first session index of that era.
   *
   * Public on staking-async runtimes; `pub(crate)` in classic `pallet_staking`,
   * so it is absent from the metadata there — `null` is returned and callers
   * fall back to `erasStartSessionIndex`.
   */
  bondedEras(api: ApiPromise) {
    const query = getPallet(api)['bondedEras'];
    if (!query) {
      return Promise.resolve(null);
    }

    const schema = pjsSchema.vec(pjsSchema.tupleMap(['era', pjsSchema.u32], ['session', pjsSchema.u32]));

    return substrateRpcPool.call(() => query()).then(schema.parse);
  },

  /**
   * The session index at which the era started for the last `HistoryDepth`
   * eras.
   */
  erasStartSessionIndex(api: ApiPromise, era: number) {
    const schema = pjsSchema.optional(pjsSchema.u32);

    return substrateRpcPool.call(() => getQuery(api, 'erasStartSessionIndex')(era)).then(schema.parse);
  },
};
