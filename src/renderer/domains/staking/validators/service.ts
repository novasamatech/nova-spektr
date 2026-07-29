import { type ApiPromise } from '@polkadot/api';

import { type ChainId, type EraIndex } from '@/shared/core';
import { keys } from '@/shared/lib/utils';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { perbillToPercent } from '../apy/calculator';
import { apyService } from '../apy/service';
import { exposureService } from '../exposures/service';
import { type ExposureOverviewMap } from '../exposures/types';
import { type ValidatorMap } from '../types';

import { mapEraValidatorToLegacy, mapEraValidatorsToLegacy } from './helpers';
import { type EraValidator, type EraValidatorMap } from './types';

/**
 * Nomination limit used when the runtime does not expose
 * `staking.maxNominations` (staking-async runtimes dropped the const).
 */
const DEFAULT_MAX_VALIDATORS = 16;

/**
 * Slash defer window used when the runtime does not expose
 * `staking.slashDeferDuration`. Matches the Polkadot value of 27 eras.
 */
const DEFAULT_SLASH_DEFER_DURATION = 27;

export const validatorsService = {
  getEraValidators,
  getValidatorsWithInfo,
  getValidatorsList,
  getMaxValidators,
  getNominators,
};

type EraValidatorsParams = {
  api: ApiPromise;
  chainId: ChainId;
  era: EraIndex;
  /** Relay-chain api. Used by the APY calculation for era timing. */
  timelineApi?: ApiPromise | null;
  /** Era exposure overviews, when already resolved by `exposuresResource`. */
  overviews?: ExposureOverviewMap;
};

/**
 * Every validator elected for the era, composed from the exposure overviews,
 * the era preferences, reward points, slashes and APY.
 */
async function getEraValidators(params: EraValidatorsParams): Promise<EraValidatorMap> {
  const { api, chainId, era, timelineApi, overviews } = params;

  const [resolvedOverviews, prefsEntries] = await Promise.all([
    overviews ?? exposureService.getEraOverviews(api, era),
    stakingPallet.storage.erasValidatorPrefs(api, era),
  ]);

  const maxExposurePageSize = getMaxExposurePageSize(api);
  const prefsMap = new Map(prefsEntries.map(({ validator, prefs }) => [validator, prefs]));
  const accountIds = keys(resolvedOverviews);

  const baseValidators = accountIds.flatMap(accountId => {
    const overview = resolvedOverviews[accountId];
    if (!overview) return [];

    const prefs = prefsMap.get(accountId);

    return [
      {
        accountId,
        totalStake: overview.total,
        ownStake: overview.own,
        commission: prefs ? perbillToPercent(prefs.commission) : 0,
        blocked: prefs?.blocked ?? false,
        nominatorCount: overview.nominatorCount,
        pageCount: overview.pageCount,
      },
    ];
  });

  const [eraPoints, slashed, apyMap] = await Promise.all([
    getEraPoints(api, era),
    getSlashedValidators(api, era, accountIds),
    apyService.getValidatorsApy({ api, timelineApi, chain: { chainId }, era, validators: baseValidators }),
  ]);

  const result: EraValidatorMap = {};
  for (const validator of baseValidators) {
    result[validator.accountId] = {
      ...validator,
      maxNominatorsRewarded: Number.isFinite(maxExposurePageSize) ? maxExposurePageSize : null,
      slashed: slashed.has(validator.accountId),
      eraPoints: eraPoints[validator.accountId] ?? 0,
      apy: apyMap[validator.accountId] ?? null,
      elected: true,
    } satisfies EraValidator;
  }

  return result;
}

/**
 * @deprecated Legacy-shaped output for the features still typed against
 *   `Validator` from `@/shared/core`. Prefer `getEraValidators`.
 */
async function getValidatorsWithInfo(api: ApiPromise, era: EraIndex): Promise<ValidatorMap> {
  const chainId = getChainId(api);
  const eraValidators = await getEraValidators({ api, chainId, era });

  return mapEraValidatorsToLegacy(eraValidators, chainId);
}

/**
 * @deprecated Alias of `getValidatorsWithInfo`, kept for the legacy Staking
 *   page. Prefer `getEraValidators`.
 */
function getValidatorsList(api: ApiPromise, era: EraIndex): Promise<ValidatorMap> {
  return getValidatorsWithInfo(api, era);
}

/**
 * Maximum number of validators a nominator may back.
 */
function getMaxValidators(api: ApiPromise): number {
  try {
    return stakingPallet.consts.maxNominations(api) ?? DEFAULT_MAX_VALIDATORS;
  } catch (error) {
    console.warn(error);

    return DEFAULT_MAX_VALIDATORS;
  }
}

/**
 * Validators currently nominated by the stash, in the legacy map shape.
 */
async function getNominators(api: ApiPromise, stash: AccountId): Promise<ValidatorMap> {
  try {
    const [entry] = await stakingPallet.storage.nominators(api, [stash]);
    const targets = entry?.nominations?.targets ?? [];
    const chainId = getChainId(api);

    const result: ValidatorMap = {};
    for (const target of targets) {
      result[target] = mapEraValidatorToLegacy(createUnknownValidator(target), chainId);
    }

    return result;
  } catch (error) {
    console.warn(error);

    return {};
  }
}

/**
 * Reward points of the last **completed** era, not of `era` itself.
 *
 * On staking-async runtimes (every Asset Hub, which is where staking lives) the
 * relay reports points to the staking chain per session, not per block.
 * Measured on Polkadot AH: `ErasRewardPoints[activeEra]` is `0` for the whole
 * first session of an era - four of every twenty-four hours the table read as a
 * column of zeros - and only reaches its final value when the era closes. The
 * value in between is a partial tally that under-reports whoever has not been
 * in a closed session yet.
 *
 * The previous era is complete and identical for everyone, which is the only
 * basis on which comparing validators means anything. (polkadot-js apps reads
 * the active era through `api.derive.staking.currentPoints` and shows the same
 * zeros; it is not a pattern worth copying.)
 */
async function getEraPoints(api: ApiPromise, era: EraIndex): Promise<Record<AccountId, number>> {
  if (era <= 0) return {};

  try {
    const points = await stakingPallet.storage.erasRewardPoints(api, era - 1);

    const result: Record<AccountId, number> = {};
    for (const { key, value } of points.individual) {
      result[key] = value;
    }

    return result;
  } catch (error) {
    console.warn(error);

    return {};
  }
}

/**
 * Validators carrying a slash inside the defer window.
 *
 * The source is picked by runtime capability, not by result emptiness - an
 * empty read is the healthy case and must not trigger a fallback.
 *
 * Classic runtimes expose `slashingSpans`, which answers the question directly
 * for every validator in one batched read. Staking-async dropped that storage,
 * so there the defer window is walked over `unappliedSlashes` instead: each era
 * is a cheap key-only read that almost always comes back empty, and the whole
 * walk happens once per era because the resource is keyed by era.
 */
async function getSlashedValidators(api: ApiPromise, era: EraIndex, validators: AccountId[]): Promise<Set<AccountId>> {
  if (validators.length === 0) return new Set();

  const slashDeferDuration = getSlashDeferDuration(api);

  try {
    const spans = await stakingPallet.storage.slashingSpans(api, validators);

    if (spans) {
      return new Set(
        spans.flatMap(({ validator, spans }) =>
          // `SlashingSpans::new` initialises `lastNonzeroSlash` to 0, so a
          // never-slashed validator carries a zero rather than an absent value.
          // Without the guard every validator on a chain younger than the defer
          // duration reads as recently slashed.
          spans && spans.lastNonzeroSlash > 0 && era - spans.lastNonzeroSlash < slashDeferDuration ? [validator] : [],
        ),
      );
    }
  } catch (error) {
    console.warn(error);
  }

  // `UnappliedSlashes` is keyed by the era the slash becomes *applicable* —
  // offence era plus `SlashDeferDuration` — and the entry is taken when that era
  // starts. Pending slashes therefore live in the eras ahead of the active one,
  // so walking backwards read a window that is empty by construction and left
  // `slashed` permanently false on every staking-async runtime (which is every
  // chain this feature targets, since they have no `SlashingSpans`).
  const eras = Array.from({ length: slashDeferDuration + 1 }, (_, index) => era + index);

  try {
    const slashed = await Promise.all(eras.map(era => stakingPallet.storage.unappliedSlashKeys(api, era)));

    return new Set(slashed.flat());
  } catch (error) {
    console.warn(error);

    return new Set();
  }
}

function getSlashDeferDuration(api: ApiPromise): number {
  try {
    return stakingPallet.consts.slashDeferDuration(api);
  } catch (error) {
    console.warn(error);

    return DEFAULT_SLASH_DEFER_DURATION;
  }
}

function getMaxExposurePageSize(api: ApiPromise): number {
  try {
    return stakingPallet.consts.maxExposurePageSize(api);
  } catch (error) {
    console.warn(error);

    // The page size is informational only; without the const the column simply
    // has no denominator to show.
    return Number.POSITIVE_INFINITY;
  }
}

function createUnknownValidator(accountId: AccountId): EraValidator {
  return {
    accountId,
    totalStake: '0',
    ownStake: '0',
    commission: 0,
    blocked: false,
    nominatorCount: 0,
    pageCount: 0,
    maxNominatorsRewarded: null,
    slashed: false,
    eraPoints: 0,
    apy: null,
    elected: true,
  };
}

function getChainId(api: ApiPromise): ChainId {
  return api.genesisHash.toHex();
}
