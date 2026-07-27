import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { chunk, uniq } from 'lodash';

import { type EraIndex } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type RewardSource } from '../types';

import { calculateNominatorPayout, calculateValidatorPayout } from './calculator';
import { fetchNominatorEraValidators } from './subquery';
import { type EraValidatorExposure, type PayoutSource, type UnclaimedPayout, type UnclaimedPayouts } from './types';

/** How deep the on-chain fallback is allowed to scan without an indexer. */
export const PAYOUTS_CHAIN_SCAN_ERAS = 8;

/** `claimedRewards` keys per storage request. */
const CLAIMED_REWARDS_CHUNK = 100;

const EMPTY_PAYOUTS: UnclaimedPayouts = { total: '0', payouts: [], source: 'unavailable' };

type GetUnclaimedPayoutsParams = {
  api: ApiPromise;
  stash: AccountId;
  activeEra: EraIndex;
  historyDepth: number;
  rewardSources: RewardSource[];
};

type ResolvedPayout = {
  era: EraIndex;
  validator: AccountId;
  page: number;
  stake: BN;
  totalStake: BN;
  isSelf: boolean;
};

function exposureKey(era: EraIndex, validator: AccountId): string {
  return `${era}-${validator}`;
}

function emptyResult(source: PayoutSource): UnclaimedPayouts {
  return { total: '0', payouts: [], source };
}

/**
 * Eras claimed under the pre-paging reward scheme — they are recorded on the
 * ledger instead of `claimedRewards`.
 */
async function getLegacyClaimedEras(api: ApiPromise, stash: AccountId): Promise<Set<EraIndex>> {
  try {
    const [bonded] = await stakingPallet.storage.bonded(api, [stash]);
    const controller = bonded?.controller ?? stash;
    const [entry] = await stakingPallet.storage.ledger(api, [controller]);

    return new Set(entry?.ledger?.legacyClaimedRewards ?? []);
  } catch (error) {
    console.warn(error);

    return new Set();
  }
}

async function getClaimedPages(
  api: ApiPromise,
  exposures: EraValidatorExposure[],
): Promise<Map<string, readonly number[]>> {
  const claimed = new Map<string, readonly number[]>();
  const keys = exposures.map(({ era, validator }) => ({ era, validator }));

  const responses = await Promise.all(
    chunk(keys, CLAIMED_REWARDS_CHUNK).map(part =>
      stakingPallet.storage.claimedRewards(api, part).catch((error: unknown) => {
        console.warn(error);

        return [];
      }),
    ),
  );

  for (const response of responses) {
    for (const { era, validator, pages } of response) {
      claimed.set(exposureKey(era, validator), pages);
    }
  }

  return claimed;
}

/**
 * `pageCount` of the given eras, keyed by `(era, validator)`. One storage walk
 * per era instead of one request per validator.
 */
async function getExposureMetadata(api: ApiPromise, eras: EraIndex[]) {
  const metadata = new Map<string, { total: BN; own: BN; pageCount: number }>();

  const responses = await Promise.all(
    eras.map(era =>
      stakingPallet.storage
        .erasStakersOverview(api, era)
        .then(items => ({ era, items }))
        .catch((error: unknown) => {
          console.warn(error);

          return null;
        }),
    ),
  );

  for (const response of responses) {
    if (!response) continue;

    for (const { validator, overview } of response.items) {
      metadata.set(exposureKey(response.era, validator), {
        total: overview.total,
        own: overview.own,
        pageCount: overview.pageCount,
      });
    }
  }

  return metadata;
}

/**
 * Exposures reachable without an indexer: current nomination targets (plus the
 * stash itself, in case it validates) over the last few eras.
 */
async function collectChainExposures(
  api: ApiPromise,
  stash: AccountId,
  eraFrom: EraIndex,
  eraTo: EraIndex,
): Promise<EraValidatorExposure[]> {
  try {
    const [nominator] = await stakingPallet.storage.nominators(api, [stash]);

    const targets = new Set<AccountId>(nominator?.nominations?.targets ?? []);
    targets.add(stash);

    const scanFrom = Math.max(eraFrom, eraTo - PAYOUTS_CHAIN_SCAN_ERAS + 1);
    const eras: EraIndex[] = [];
    for (let era = scanFrom; era <= eraTo; era++) {
      eras.push(era);
    }

    const metadata = await getExposureMetadata(api, eras);

    const exposures: EraValidatorExposure[] = [];
    for (const era of eras) {
      for (const validator of targets) {
        const entry = metadata.get(exposureKey(era, validator));
        if (!entry) continue;

        exposures.push({
          era,
          validator,
          total: entry.total.toString(),
          own: entry.own.toString(),
        });
      }
    }

    return exposures;
  } catch (error) {
    console.warn(error);

    return [];
  }
}

/**
 * Turns exposures into concrete `(era, validator, page)` claims, dropping
 * everything already paid out.
 */
async function resolvePayoutPages(
  api: ApiPromise,
  stash: AccountId,
  exposures: EraValidatorExposure[],
  claimed: Map<string, readonly number[]>,
): Promise<ResolvedPayout[]> {
  const selfPayouts: ResolvedPayout[] = [];
  const withClaimedPages: EraValidatorExposure[] = [];
  const needsPageLookup: EraValidatorExposure[] = [];

  for (const exposure of exposures) {
    const claimedPages = claimed.get(exposureKey(exposure.era, exposure.validator)) ?? [];

    // Own validator reward always lives on page 0.
    if (exposure.validator === stash) {
      if (!claimedPages.includes(0)) {
        selfPayouts.push({
          era: exposure.era,
          validator: exposure.validator,
          page: 0,
          stake: new BN(exposure.own),
          totalStake: new BN(exposure.total),
          isSelf: true,
        });
      }
      continue;
    }

    if (claimedPages.length === 0) {
      needsPageLookup.push(exposure);
    } else {
      withClaimedPages.push(exposure);
    }
  }

  // Validators with every page already paid out need no page lookup at all.
  if (withClaimedPages.length > 0) {
    const metadata = await getExposureMetadata(api, uniq(withClaimedPages.map(exposure => exposure.era)));

    for (const exposure of withClaimedPages) {
      const key = exposureKey(exposure.era, exposure.validator);
      const pageCount = metadata.get(key)?.pageCount ?? 0;
      const claimedPages = claimed.get(key) ?? [];

      if (pageCount > 0 && claimedPages.length >= pageCount) continue;

      needsPageLookup.push(exposure);
    }
  }

  const paged = await Promise.all(
    needsPageLookup.map(async exposure => {
      const pages = await stakingPallet.storage
        .erasStakersPaged(api, exposure.era, exposure.validator)
        .catch((error: unknown) => {
          console.warn(error);

          return [];
        });

      for (const { page, exposure: pageExposure } of pages) {
        const own = pageExposure.others.find(other => other.who === stash);
        if (!own) continue;

        const claimedPages = claimed.get(exposureKey(exposure.era, exposure.validator)) ?? [];
        if (claimedPages.includes(page)) return null;

        return {
          era: exposure.era,
          validator: exposure.validator,
          page,
          stake: own.value,
          totalStake: new BN(exposure.total),
          isSelf: false,
        };
      }

      return null;
    }),
  );

  return selfPayouts.concat(paged.filter(nonNullable));
}

async function calculatePayouts(
  api: ApiPromise,
  resolved: ResolvedPayout[],
): Promise<{ total: string; payouts: UnclaimedPayout[] }> {
  const eras = uniq(resolved.map(item => item.era));

  const [eraRewards, eraPoints, eraPrefs] = await Promise.all([
    stakingPallet.storage.erasValidatorReward(api, eras),
    Promise.all(eras.map(era => stakingPallet.storage.erasRewardPoints(api, era).then(points => ({ era, points })))),
    stakingPallet.storage.erasValidatorPrefsFor(
      api,
      resolved.map(({ era, validator }) => ({ era, validator })),
    ),
  ]);

  const rewardByEra = new Map(eraRewards.map(({ era, reward }) => [era, reward]));
  const pointsByEra = new Map(
    eraPoints.map(({ era, points }) => [
      era,
      {
        total: new BN(points.total),
        individual: new Map(points.individual.map(({ key, value }) => [key, new BN(value)])),
      },
    ]),
  );
  const commissionByKey = new Map(
    eraPrefs.map(({ era, validator, prefs }) => [exposureKey(era, validator), prefs.commission]),
  );

  const payouts: UnclaimedPayout[] = [];
  let total = BN_ZERO;

  for (const item of resolved) {
    const eraReward = rewardByEra.get(item.era);
    const points = pointsByEra.get(item.era);
    if (!eraReward || !points) continue;

    const validatorPoints = points.individual.get(item.validator);
    if (!validatorPoints || validatorPoints.isZero()) continue;

    const commission = commissionByKey.get(exposureKey(item.era, item.validator)) ?? BN_ZERO;

    const share = { eraReward, validatorPoints, totalPoints: points.total };
    const amount = item.isSelf
      ? calculateValidatorPayout({ ...share, commission, ownStake: item.stake, totalStake: item.totalStake })
      : calculateNominatorPayout({ ...share, commission, stake: item.stake, totalStake: item.totalStake });

    if (amount.isZero()) continue;

    total = total.add(amount);
    payouts.push({ era: item.era, validator: item.validator, page: item.page, amount: amount.toString() });
  }

  payouts.sort((a, b) => b.era - a.era);

  return { total: total.toString(), payouts };
}

/**
 * Unclaimed staking rewards of a stash within the runtime `historyDepth`.
 */
export async function getUnclaimedPayouts({
  api,
  stash,
  activeEra,
  historyDepth,
  rewardSources,
}: GetUnclaimedPayoutsParams): Promise<UnclaimedPayouts> {
  const eraFrom = Math.max(0, activeEra - historyDepth);
  const eraTo = activeEra - 1;

  const hasIndexer = rewardSources.length > 0;

  if (eraTo < eraFrom) {
    return emptyResult(hasIndexer ? 'subquery' : 'chain');
  }

  const exposures = hasIndexer
    ? await fetchNominatorEraValidators({ rewardSources, stash, eraFrom, eraTo })
    : await collectChainExposures(api, stash, eraFrom, eraTo);

  const source: PayoutSource = hasIndexer ? 'subquery' : exposures.length > 0 ? 'chain' : 'unavailable';
  if (source === 'unavailable') return EMPTY_PAYOUTS;
  if (exposures.length === 0) return emptyResult(source);

  const legacyClaimedEras = await getLegacyClaimedEras(api, stash);
  const candidates = exposures.filter(exposure => !legacyClaimedEras.has(exposure.era));
  if (candidates.length === 0) return emptyResult(source);

  const claimed = await getClaimedPages(api, candidates);
  const resolved = await resolvePayoutPages(api, stash, candidates, claimed);
  if (resolved.length === 0) return emptyResult(source);

  const { total, payouts } = await calculatePayouts(api, resolved);

  return { total, payouts, source };
}

export const payoutsService = {
  getUnclaimedPayouts,
};
