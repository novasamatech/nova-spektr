import { type ApiPromise } from '@polkadot/api';
import { default as BigNumber } from 'bignumber.js';

import { type Chain, type EraIndex } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { AssetHubChains } from '../constants';
import { type ApyValidator } from '../types';

import {
  calculateAvgRewardPercent,
  calculateExpectedApy,
  calculateValidatorApy,
  calculateYearlyInflation,
  getMedianCommission,
} from './calculator';

const MILLISECONDS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const DEFAULT_ERA_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Era duration fallback (ms), used when the relay-chain Babe consts are not yet
 * available (e.g. the relay api hasn't connected). Keeps APY visible without
 * making the dashboard depend on the relay connection.
 */
const FALLBACK_ERA_DURATION_MS: Record<string, number> = {
  [AssetHubChains.POLKADOT_AH]: 24 * 60 * 60 * 1000, // 24h
  [AssetHubChains.KUSAMA_AH]: 6 * 60 * 60 * 1000, // 6h
  [AssetHubChains.WESTEND_AH]: 6 * 60 * 60 * 1000, // 6h
};

type ChainRef = Pick<Chain, 'chainId'>;

export const apyService = {
  getStakersEraReward,
  getEraDurationMs,
  getAvgRewardPercent,
  getNetworkApy,
  getValidatorsApy,
};

/**
 * Era duration in milliseconds.
 *
 * Asset Hub is a parachain and has no Babe pallet, so the era length is derived
 * from the relay chain: `sessionsPerEra (Asset Hub) × epochDuration × blockTime
 * (relay)`. The relay block time (≈6s) must be used here — using the Asset Hub
 * block time (≈12s) would double the era length and halve the resulting APY.
 */
function getEraDurationMs(api: ApiPromise, timelineApi: ApiPromise | null | undefined, chain: ChainRef): number {
  try {
    const babe = timelineApi?.consts['babe'];
    if (babe?.['epochDuration'] && babe['expectedBlockTime']) {
      const sessionsPerEra = stakingPallet.consts.sessionsPerEra(api);
      const epochDuration = Number(babe['epochDuration'].toString());
      const blockTime = Number(babe['expectedBlockTime'].toString());
      const eraDuration = sessionsPerEra * epochDuration * blockTime;
      if (eraDuration > 0) return eraDuration;
    }
  } catch (error) {
    console.warn('Unable to derive era duration from relay chain', error);
  }

  return FALLBACK_ERA_DURATION_MS[chain.chainId] ?? DEFAULT_ERA_DURATION_MS;
}

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
