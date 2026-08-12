import { type ApiPromise } from '@polkadot/api';
import { default as BigNumber } from 'bignumber.js';

import { type Chain, type EraIndex } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { getEraDurationMs } from '../era/duration';
import { type ApyValidator } from '../types';

import {
  calculateAvgRewardPercent,
  calculateExpectedApy,
  calculateValidatorApy,
  calculateYearlyInflation,
  getMedianCommission,
} from './calculator';

const MILLISECONDS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const NETWORK_AVG_WINDOW_MS = 30 * MILLISECONDS_PER_DAY;

type ChainRef = Pick<Chain, 'chainId'>;

export const apyService = {
  getStakersEraReward,
  getAvgRewardPercent,
  getNetworkApy,
  getNetworkAvgRewardRate,
  getValidatorsApy,
};

/**
 * Per-era reward paid to stakers (validators + nominators), before commission.
 *
 * Reads the last completed era's realized payout (`erasValidatorReward`) - the
 * exact budget nominator payouts draw from. The
 * `inflation.experimentalIssuancePredictionInfo` runtime API is deliberately
 * not used: since the Dynamic Allocation Pool reform (fellows-runtimes v2.3.0,
 * 2026-06) its `nextMint` reports the total era emission on Polkadot, of which
 * stakers only receive the DAP staker allocation (~45%) - treating it as the
 * staker reward overstates APY ~2.2×.
 *
 * Returns `null` when the chain genuinely reports no reward for the era; throws
 * when the query fails, so a transient error is never mistaken for a chain
 * without era payouts.
 */
async function getStakersEraReward(api: ApiPromise, era: EraIndex): Promise<BigNumber | null> {
  const [entry] = await stakingPallet.storage.erasValidatorReward(api, [Math.max(era - 1, 0)]);

  return entry?.reward ? new BigNumber(entry.reward.toString()) : null;
}

async function getTotalStaked(api: ApiPromise, era: EraIndex): Promise<BigNumber | null> {
  try {
    const totalStake = await stakingPallet.storage.erasTotalStake(api, era);
    const value = new BigNumber(totalStake.toString());

    return value.isGreaterThan(0) ? value : null;
  } catch (error) {
    console.warn(error);

    return null;
  }
}

async function getTotalIssuance(api: ApiPromise): Promise<BigNumber | null> {
  try {
    const totalIssuance = await api.query['balances']?.['totalIssuance']?.();
    if (!totalIssuance) return null;

    const value = new BigNumber(totalIssuance.toString());

    return value.isGreaterThan(0) ? value : null;
  } catch (error) {
    console.warn(error);

    return null;
  }
}

type AvgRewardPercentParams = {
  api: ApiPromise;
  /** Relay-chain api, used to derive the era duration. */
  timelineApi?: ApiPromise | null;
  chain: ChainRef;
  era: EraIndex;
  /** Total stake of the era, in planck. */
  totalStaked: BigNumber;
};

/**
 * Gross yearly reward rate of the whole staked pool, as a fraction.
 *
 * Derived from the chain's actual per-era staker reward annualised over the era
 * length (`reward × erasPerYear / totalStaked`), which is correct for both the
 * legacy NPoS inflation curve (Kusama) and the fixed inflation model (Polkadot,
 * ref. 1139). The curve is only re-derived when the chain reports no era reward
 * at all; a failed reward query leaves the APY unknown instead - on Polkadot
 * the curve is known to overstate ~2.7×, and a wrong value would be cached for
 * the rest of the era.
 */
async function getAvgRewardPercent(params: AvgRewardPercentParams): Promise<number | null> {
  const { api, timelineApi, chain, era, totalStaked } = params;

  if (!totalStaked.isFinite() || totalStaked.isLessThanOrEqualTo(0)) return null;

  let stakersEraReward: BigNumber | null;
  try {
    stakersEraReward = await getStakersEraReward(api, era);
  } catch (error) {
    console.warn('era reward query failed, leaving the apy unknown', error);

    return null;
  }

  if (stakersEraReward?.isGreaterThan(0)) {
    const erasPerYear = MILLISECONDS_PER_YEAR / getEraDurationMs(api, timelineApi, chain);

    return stakersEraReward.multipliedBy(erasPerYear).div(totalStaked).toNumber();
  }

  const totalIssuance = await getTotalIssuance(api);
  if (!totalIssuance) return null;

  const stakedPortion = totalStaked.div(totalIssuance).toNumber();

  return calculateAvgRewardPercent({ yearlyInflation: calculateYearlyInflation(stakedPortion), stakedPortion });
}

type NetworkApyParams = {
  api: ApiPromise;
  timelineApi?: ApiPromise | null;
  chain: ChainRef;
  era: EraIndex;
  validators: Pick<ApyValidator, 'commission'>[];
};

/**
 * Network average staking APY shown on the dashboard, in percent.
 */
async function getNetworkApy(params: NetworkApyParams): Promise<string | null> {
  const { api, timelineApi, chain, era, validators } = params;

  const totalStaked = await getTotalStaked(api, era);
  if (!totalStaked) return null;

  const avgRewardPercent = await getAvgRewardPercent({ api, timelineApi, chain, era, totalStaked });
  if (avgRewardPercent === null) return null;

  const medianCommission = getMedianCommission(validators.map(validator => validator.commission));

  return calculateExpectedApy(avgRewardPercent, medianCommission).toFixed(2);
}

export type NetworkAvgRate = {
  /**
   * Net-of-median-commission average reward rate over the window, percent, 2
   * dp.
   */
  ratePercent: string;
  /**
   * Inclusive lower bound of the eras that actually produced a rate. The range
   * `[fromEra, toEra]` may contain gaps — eras with no recorded reward or zero
   * stake are skipped rather than counted.
   */
  fromEra: EraIndex;
  /**
   * Inclusive upper bound of the eras that actually produced a rate. The range
   * `[fromEra, toEra]` may contain gaps — eras with no recorded reward or zero
   * stake are skipped rather than counted.
   */
  toEra: EraIndex;
  /** The eras that actually produced a rate, expressed in days. */
  days: number;
};

type NetworkAvgRateParams = {
  api: ApiPromise;
  timelineApi?: ApiPromise | null;
  chain: ChainRef;
  era: EraIndex;
  validators: Pick<ApyValidator, 'commission'>[];
};

/**
 * Network average reward rate over a trailing ~30 day window, in percent.
 *
 * The benchmark shown beside the dashboard's Est. APY: the mean of per-era
 * realized rates (`erasValidatorReward × erasPerYear / erasTotalStake`) over
 * the last ~30 days of completed eras, capped by the runtime `HistoryDepth` (84
 * eras ≈ 21 days on Kusama Asset Hub). Made net of the current median
 * commission so it is directly comparable with `getNetworkApy`. Realized-only
 * on purpose — no NPoS-curve fallback: a benchmark that cannot be measured is
 * left unknown, never guessed.
 */
async function getNetworkAvgRewardRate(params: NetworkAvgRateParams): Promise<NetworkAvgRate | null> {
  const { api, timelineApi, chain, era, validators } = params;

  const eraDurationMs = getEraDurationMs(api, timelineApi, chain);
  const erasPerYear = MILLISECONDS_PER_YEAR / eraDurationMs;

  let historyDepth: number;
  try {
    historyDepth = stakingPallet.consts.historyDepth(api);
  } catch (error) {
    console.warn('history depth unavailable, leaving the network average unknown', error);

    return null;
  }

  const targetEras = Math.max(1, Math.round(NETWORK_AVG_WINDOW_MS / eraDurationMs));
  const windowSize = Math.min(targetEras, historyDepth, era);
  if (windowSize <= 0) return null;

  const windowEras = Array.from({ length: windowSize }, (_, index) => era - windowSize + index);

  let eraRewards: Awaited<ReturnType<typeof stakingPallet.storage.erasValidatorReward>>;
  let eraStakes: Awaited<ReturnType<typeof stakingPallet.storage.erasTotalStakeMulti>>;
  try {
    eraRewards = await stakingPallet.storage.erasValidatorReward(api, windowEras);
    eraStakes = await stakingPallet.storage.erasTotalStakeMulti(api, windowEras);
  } catch (error) {
    console.warn('era reward/stake history query failed, leaving the network average unknown', error);

    return null;
  }

  const contributions: { era: EraIndex; rate: number }[] = [];
  for (let index = 0; index < windowEras.length; index += 1) {
    const rewardEntry = eraRewards[index];
    const stakeEntry = eraStakes[index];
    if (!rewardEntry || !stakeEntry || rewardEntry.era !== stakeEntry.era) continue;

    const { reward } = rewardEntry;
    if (!reward) continue;

    const rewardValue = new BigNumber(reward.toString());
    if (!rewardValue.isGreaterThan(0)) continue;

    const totalStaked = new BigNumber(stakeEntry.totalStake.toString());
    if (!totalStaked.isGreaterThan(0)) continue;

    contributions.push({
      era: rewardEntry.era,
      rate: rewardValue.multipliedBy(erasPerYear).div(totalStaked).toNumber(),
    });
  }

  if (contributions.length === 0) return null;

  const grossAverage = contributions.reduce((acc, { rate }) => acc + rate, 0) / contributions.length;
  const medianCommission = getMedianCommission(validators.map(validator => validator.commission));

  return {
    ratePercent: calculateExpectedApy(grossAverage, medianCommission).toFixed(2),
    fromEra: contributions[0]!.era,
    toEra: contributions[contributions.length - 1]!.era,
    days: Math.max(1, Math.round((contributions.length * eraDurationMs) / MILLISECONDS_PER_DAY)),
  };
}

type ValidatorsApyParams = {
  api: ApiPromise;
  timelineApi?: ApiPromise | null;
  chain: ChainRef;
  era: EraIndex;
  validators: ApyValidator[];
};

/**
 * APY per validator, in percent.
 *
 * The pool-wide reward rate comes from the era's real staker reward, so chains
 * with fixed inflation (Polkadot Asset Hub) are not over-stated the way
 * re-deriving the NPoS curve would.
 */
async function getValidatorsApy(params: ValidatorsApyParams): Promise<Record<AccountId, number>> {
  const { api, timelineApi, chain, era, validators } = params;

  if (validators.length === 0) return {};

  const totalStaked = (await getTotalStaked(api, era)) ?? sumStake(validators);
  if (totalStaked.isLessThanOrEqualTo(0)) return {};

  const avgRewardPercent = await getAvgRewardPercent({ api, timelineApi, chain, era, totalStaked });
  if (avgRewardPercent === null) return {};

  const avgStake = totalStaked.div(validators.length);

  const result: Record<AccountId, number> = {};
  for (const validator of validators) {
    result[validator.accountId] = calculateValidatorApy({
      totalStake: validator.totalStake,
      commission: validator.commission,
      avgStake,
      avgRewardPercent,
    });
  }

  return result;
}

function sumStake(validators: ApyValidator[]): BigNumber {
  return validators.reduce((acc, { totalStake }) => acc.plus(new BigNumber(totalStake)), new BigNumber(0));
}
