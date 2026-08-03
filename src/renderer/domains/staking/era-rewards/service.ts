import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { uniq } from 'lodash';

import { type EraIndex } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { exposureKey } from '../exposure-key';
import { calculateNominatorPayout, calculateValidatorPayout } from '../payouts/calculator';
import { type RewardSource } from '../types';

import { fetchEraExposureShares } from './subquery';
import { type EraExposureShares, type EraValidatorReward } from './types';

type Params = {
  api: ApiPromise;
  stashes: AccountId[];
  eraFrom: EraIndex;
  eraTo: EraIndex;
  rewardSources: RewardSource[];
};

/**
 * The era arithmetic, applied to every stash exposed to the validator.
 *
 * Exactly the formula the runtime uses when the payout is submitted, so the
 * figure matches what the era will pay — but it is the era's promise, not a
 * receipt. Eras a validator earned no points in pay nothing and are skipped
 * rather than written down as zero.
 */
function computeRewards(
  exposures: EraExposureShares[],
  rewardByEra: Map<EraIndex, BN | null>,
  pointsByEra: Map<EraIndex, { total: BN; individual: Map<AccountId, BN> }>,
  commissionByKey: Map<string, BN>,
): EraValidatorReward[] {
  const rewards: EraValidatorReward[] = [];

  for (const exposure of exposures) {
    const eraReward = rewardByEra.get(exposure.era);
    const points = pointsByEra.get(exposure.era);
    if (!eraReward || !points) continue;

    const validatorPoints = points.individual.get(exposure.validator);
    if (!validatorPoints || validatorPoints.isZero()) continue;

    const commission = commissionByKey.get(exposureKey(exposure.era, exposure.validator)) ?? BN_ZERO;
    const totalStake = new BN(exposure.total);
    const share = { eraReward, validatorPoints, totalPoints: points.total };

    for (const [accountId, value] of Object.entries(exposure.shares) as [AccountId, string][]) {
      const isSelf = accountId === exposure.validator;
      const amount = isSelf
        ? calculateValidatorPayout({ ...share, commission, ownStake: new BN(exposure.own), totalStake })
        : calculateNominatorPayout({ ...share, commission, stake: new BN(value), totalStake });

      if (amount.isZero()) continue;

      rewards.push({
        era: exposure.era,
        validator: exposure.validator,
        accountId,
        amount: amount.toString(),
        isSelf,
      });
    }
  }

  return rewards.sort((a, b) => b.era - a.era);
}

/**
 * What each stash earned from each validator, era by era.
 *
 * Reconstructed rather than read: the reward indexer records an amount and an
 * address, never the validator behind it, so the only route to "who earns for
 * me" is to replay the era's own formula over the exposures. Costs one indexer
 * page walk plus a handful of storage reads per era, which is why the caller
 * decides the era range instead of always asking for the full history.
 */
export async function getEraValidatorRewards({
  api,
  stashes,
  eraFrom,
  eraTo,
  rewardSources,
}: Params): Promise<EraValidatorReward[]> {
  if (eraTo < eraFrom || stashes.length === 0) return [];

  const exposures = await fetchEraExposureShares({ rewardSources, stashes, eraFrom, eraTo });
  if (!exposures || exposures.length === 0) return [];

  const eras = uniq(exposures.map(exposure => exposure.era));

  const [eraRewards, eraPoints, eraPrefs] = await Promise.all([
    stakingPallet.storage.erasValidatorReward(api, eras),
    Promise.all(eras.map(era => stakingPallet.storage.erasRewardPoints(api, era).then(points => ({ era, points })))),
    stakingPallet.storage.erasValidatorPrefsFor(
      api,
      exposures.map(({ era, validator }) => ({ era, validator })),
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

  return computeRewards(exposures, rewardByEra, pointsByEra, commissionByKey);
}

export const eraRewardsService = {
  getEraValidatorRewards,
};
