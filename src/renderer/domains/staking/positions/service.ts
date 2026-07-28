import { BN, BN_ZERO } from '@polkadot/util';

import { type EraIndex, type Unlocking } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraAnchor } from '../era/service';
import { type ExposureMap } from '../exposures/types';
import { type EraValidatorMap } from '../validators/types';

import {
  type DerivePositionInput,
  type PositionStatus,
  type PositionStatusReason,
  type StakingPosition,
  type UnbondingChunk,
} from './types';

export const positionsService = {
  derivePosition,
  derivePositions,
  deriveRedeemable,
  deriveUnbondingChunks,
};

/**
 * `Unlocking.era` comes off the ledger as a stringified number. A malformed
 * value is treated as era `0`, which makes the chunk redeemable - the amount
 * stays visible instead of silently disappearing from both sums.
 */
function parseEra(era: string): EraIndex {
  const parsed = Number(era);

  return Number.isFinite(parsed) ? parsed : 0;
}

function sumPlanck(values: string[]): string {
  return values.reduce<BN>((acc, value) => acc.add(new BN(value)), BN_ZERO).toString();
}

/**
 * Planck sum of the chunks that already unlocked (`era <= activeEra`) and can
 * be withdrawn.
 */
function deriveRedeemable(unlocking: Unlocking[], activeEra: EraIndex): string {
  const redeemable = unlocking.filter(chunk => parseEra(chunk.era) <= activeEra);

  return sumPlanck(redeemable.map(chunk => chunk.value));
}

/**
 * Every unlocking chunk resolved against the active era, soonest first.
 *
 * Both redeemable and still-unbonding chunks are returned - `redeemable` tells
 * them apart, so a single call feeds the whole unstaking list.
 */
function deriveUnbondingChunks(
  unlocking: Unlocking[],
  activeEra: EraIndex,
  eraAnchor: EraAnchor | null,
): UnbondingChunk[] {
  const chunks = unlocking.map<UnbondingChunk>(chunk => {
    const era = parseEra(chunk.era);
    const erasDiff = era - activeEra;

    return {
      value: chunk.value,
      era,
      erasLeft: Math.max(0, erasDiff),
      unlockEstimateMs: eraAnchor ? eraAnchor.eraStartMs + erasDiff * eraAnchor.eraDurationMs : null,
      redeemable: era <= activeEra,
    };
  });

  return chunks.sort((a, b) => a.era - b.era);
}

/**
 * Nominated validators whose active-era exposure contains the stash - the ones
 * actually paying rewards to this position.
 */
function deriveActiveValidators(stash: AccountId, targets: AccountId[], exposures: ExposureMap): AccountId[] {
  return targets.filter(target => exposures[target]?.others.some(individual => individual.who === stash));
}

/**
 * Why a nominating position is not exposed. Never guessed: without the era
 * validator set the reason stays `null`.
 */
function deriveStatusReason(targets: AccountId[], validators: EraValidatorMap | null): PositionStatusReason {
  if (!validators) return null;

  const electedTargets = targets.filter(target => validators[target]?.elected);

  return electedTargets.length === 0 ? 'notElected' : 'notExposed';
}

function derivePosition(input: DerivePositionInput): StakingPosition {
  const { accountId, chainId, stake, nomination, exposures, validators, activeEra, eraAnchor } = input;

  const targets = nomination?.targets ?? [];
  const chunks = deriveUnbondingChunks(stake.unlocking, activeEra, eraAnchor);
  const unbonding = chunks.filter(chunk => !chunk.redeemable);

  const activeValidators = deriveActiveValidators(stake.stash, targets, exposures);

  let status: PositionStatus;
  let statusReason: PositionStatusReason = null;

  if (!nomination || targets.length === 0) {
    // A ledger without nominations - bonded, but not nominating.
    status = 'bonded';
  } else if (nomination.submittedIn >= activeEra) {
    // The election has not applied these nominations yet, so the absence of an
    // exposure is expected - this check has to come first.
    status = 'waiting';
  } else if (activeValidators.length > 0) {
    status = 'active';
  } else {
    status = 'inactive';
    statusReason = deriveStatusReason(targets, validators);
  }

  return {
    accountId,
    chainId,
    stake,
    status,
    statusReason,
    nominations: targets,
    activeValidators,
    unbonding,
    redeemable: deriveRedeemable(stake.unlocking, activeEra),
    totalUnbonding: sumPlanck(unbonding.map(chunk => chunk.value)),
  };
}

function derivePositions(inputs: DerivePositionInput[]): StakingPosition[] {
  return inputs.map(derivePosition);
}
