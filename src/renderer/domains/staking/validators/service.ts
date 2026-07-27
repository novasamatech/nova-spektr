import { type ApiPromise } from '@polkadot/api';

import { type ChainId, type EraIndex } from '@/shared/core';
import { keys } from '@/shared/lib/utils';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
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
  getCurrentSession,
  getAuthoredBlocks,
};

type EraValidatorsParams = {
  api: ApiPromise;
  chainId: ChainId;
  era: EraIndex;
  /** Relay-chain api. Enables the authored-blocks probe. */
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

  const [eraPoints, slashed, apyMap, blocksAuthored] = await Promise.all([
    getEraPoints(api, era),
    getSlashedValidators(api, era, accountIds),
    apyService.getValidatorsApy({ api, timelineApi, chain: { chainId }, era, validators: baseValidators }),
    resolveAuthoredBlocks(timelineApi, accountIds),
  ]);

  const result: EraValidatorMap = {};
  for (const validator of baseValidators) {
    result[validator.accountId] = {
      ...validator,
      maxNominatorsRewarded: Number.isFinite(maxExposurePageSize) ? maxExposurePageSize : null,
      oversubscribed: exposureService.checkOversubscribed(validator.nominatorCount, maxExposurePageSize),
      slashed: slashed.has(validator.accountId),
      eraPoints: eraPoints[validator.accountId] ?? 0,
      blocksAuthored: blocksAuthored?.[validator.accountId] ?? null,
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
 * Current session index of the timeline (relay) chain.
 */
async function getCurrentSession(timelineApi: ApiPromise): Promise<number | null> {
  const query = timelineApi.query['session']?.['currentIndex'];
  if (!query) return null;

  try {
    return pjsSchema.u32.parse(await query());
  } catch (error) {
    console.warn(error);

    return null;
  }
}

/**
 * Blocks authored by each validator in the given session.
 *
 * `imOnline` only exists on relay chains, so this must be probed on the
 * timeline api - Asset Hub has no such pallet. Returns `null` when the counter
 * is unavailable, so callers can distinguish "zero blocks" from "unknown".
 */
async function getAuthoredBlocks(
  timelineApi: ApiPromise,
  session: number,
  validators: AccountId[],
): Promise<Record<AccountId, number> | null> {
  const query = timelineApi.query['imOnline']?.['authoredBlocks'];
  if (!query || validators.length === 0) return null;

  try {
    const raw = await query.multi(validators.map(validator => [session, validator]));
    const counts = pjsSchema.vec(pjsSchema.u32).parse(raw);

    const result: Record<AccountId, number> = {};
    for (const [index, validator] of validators.entries()) {
      result[validator] = counts[index] ?? 0;
    }

    return result;
  } catch (error) {
    console.warn(error);

    return null;
  }
}

async function resolveAuthoredBlocks(
  timelineApi: ApiPromise | null | undefined,
  validators: AccountId[],
): Promise<Record<AccountId, number> | null> {
  if (!timelineApi) return null;

  const session = await getCurrentSession(timelineApi);
  if (session === null) return null;

  return getAuthoredBlocks(timelineApi, session, validators);
}

async function getEraPoints(api: ApiPromise, era: EraIndex): Promise<Record<AccountId, number>> {
  try {
    const points = await stakingPallet.storage.erasRewardPoints(api, era);

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
          spans && era - spans.lastNonzeroSlash < slashDeferDuration ? [validator] : [],
        ),
      );
    }
  } catch (error) {
    console.warn(error);
  }

  const oldestEra = Math.max(0, era - slashDeferDuration + 1);
  const eras = Array.from({ length: era - oldestEra + 1 }, (_, index) => oldestEra + index);

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

    // Without the const nothing can be proven oversubscribed - don't warn falsely.
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
    oversubscribed: false,
    slashed: false,
    eraPoints: 0,
    blocksAuthored: null,
    apy: null,
    elected: true,
  };
}

function getChainId(api: ApiPromise): ChainId {
  return api.genesisHash.toHex();
}
