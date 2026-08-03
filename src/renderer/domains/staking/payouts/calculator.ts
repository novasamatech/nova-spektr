import { BN, BN_ZERO } from '@polkadot/util';

/** `commission` is stored as `Perbill` — parts per billion. */
export const PERBILL = new BN(1_000_000_000);

type EraRewardShare = {
  /** Total validator payout of the era (`erasValidatorReward`). */
  eraReward: BN;
  /** Reward points the validator earned in the era. */
  validatorPoints: BN;
  /** Reward points of every validator in the era. */
  totalPoints: BN;
};

export type NominatorPayoutParams = EraRewardShare & {
  commission: BN;
  /** Stake the nominator exposed to this validator. */
  stake: BN;
  /** Full exposure of the validator, self stake included. */
  totalStake: BN;
};

export type ValidatorPayoutParams = EraRewardShare & {
  commission: BN;
  ownStake: BN;
  totalStake: BN;
};

/**
 * Share of the era payout the validator earned with its reward points. Eras
 * where the validator earned nothing pay out nothing.
 */
function calculateEraShare({ eraReward, validatorPoints, totalPoints }: EraRewardShare): BN {
  if (totalPoints.isZero() || validatorPoints.isZero() || eraReward.isZero()) return BN_ZERO;

  return eraReward.mul(validatorPoints).div(totalPoints);
}

function splitCommission(validatorPayout: BN, commission: BN) {
  const cappedCommission = BN.min(BN.max(commission, BN_ZERO), PERBILL);
  const commissionPayout = validatorPayout.mul(cappedCommission).div(PERBILL);

  return { commissionPayout, leftoverPayout: validatorPayout.sub(commissionPayout) };
}

/**
 * Reward of a nominator backing the validator in the given era.
 */
export function calculateNominatorPayout({ commission, stake, totalStake, ...share }: NominatorPayoutParams): BN {
  const validatorPayout = calculateEraShare(share);
  if (validatorPayout.isZero() || totalStake.isZero() || stake.isZero()) return BN_ZERO;

  const { leftoverPayout } = splitCommission(validatorPayout, commission);

  return leftoverPayout.mul(stake).div(totalStake);
}

/**
 * Reward of the validator itself — commission plus the share of its own stake.
 */
export function calculateValidatorPayout({ commission, ownStake, totalStake, ...share }: ValidatorPayoutParams): BN {
  const validatorPayout = calculateEraShare(share);
  if (validatorPayout.isZero() || totalStake.isZero()) return BN_ZERO;

  const { commissionPayout, leftoverPayout } = splitCommission(validatorPayout, commission);
  const ownPayout = ownStake.isZero() ? BN_ZERO : leftoverPayout.mul(ownStake).div(totalStake);

  return commissionPayout.add(ownPayout);
}
