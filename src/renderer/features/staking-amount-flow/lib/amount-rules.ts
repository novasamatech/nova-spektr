import { type BN, BN_ZERO } from '@polkadot/util';

import { type EraAnchor } from '@/domains/staking';
import { type AmountFlowMode } from '../types';

/**
 * The pure arithmetic behind the amount screen.
 *
 * Everything here works in planck and takes `BN`, never `number`: a Polkadot
 * balance overflows `Number.MAX_SAFE_INTEGER` three orders of magnitude before
 * it reaches one whole DOT, so a single `Number(...)` anywhere in this file
 * would silently round a user's stake.
 *
 * Nothing here reads the wall clock — the unlock projection takes `nowMs` — so
 * the same inputs always print the same screen, in the app and in a test
 * alike.
 */

type StakeMathParams = {
  /** Active (bonded) stake of the position, planck. */
  activeStake: BN;
  /** Amount the user typed, planck. */
  amount: BN;
};

/** What stays bonded after the unbond. Never negative. */
export function getRemainingStake({ activeStake, amount }: StakeMathParams): BN {
  const remaining = activeStake.sub(amount);

  return remaining.isNeg() ? BN_ZERO : remaining;
}

/** The user is unbonding the whole position. */
export function isFullUnbond({ activeStake, amount }: StakeMathParams): boolean {
  if (amount.isZero()) return false;

  return amount.gte(activeStake);
}

type MinimumBondParams = StakeMathParams & {
  /**
   * Chain's minimum active bond for a nominator, planck. `BN_ZERO` when
   * unknown.
   */
  minimumBond: BN;
};

/**
 * The amber warning of frame F7: what is left would be too small to keep
 * nominating.
 *
 * Two cases are deliberately _not_ a warning:
 *
 * - **exactly at the minimum** — a position sitting on the minimum is still a
 *   valid, earning position; warning there would be crying wolf;
 * - **a full unbond** — leaving nothing behind is the intended way out, not a
 *   mistake.
 *
 * This never blocks `Continue`. It is a legal, merely suboptimal, action.
 */
export function isBelowMinimumBond({ activeStake, amount, minimumBond }: MinimumBondParams): boolean {
  if (minimumBond.isZero()) return false;

  const remaining = getRemainingStake({ activeStake, amount });
  if (remaining.isZero()) return false;

  return remaining.lt(minimumBond);
}

/**
 * Whether the unbond must be wrapped as `BATCH_ALL(chill, unbond)`.
 *
 * Ported from `staking-unstake`'s form model, which chills whenever the
 * remainder falls to or below the minimum bond. One correction: the old rule
 * used `<=`, so unbonding down to _exactly_ the minimum — a position that stays
 * perfectly valid — silently dropped the user's nominations too. Here the
 * boundary is strict (`<`), matching the warning above, and a full unbond
 * always chills regardless of whether the minimum is known.
 */
export function shouldChill({ activeStake, amount, minimumBond }: MinimumBondParams): boolean {
  if (amount.isZero()) return false;

  const remaining = getRemainingStake({ activeStake, amount });
  if (remaining.isZero()) return true;
  if (minimumBond.isZero()) return false;

  return remaining.lt(minimumBond);
}

type MaxAmountParams = {
  /** Active stake — the ceiling when unbonding. */
  activeStake: BN;
  /** Spendable balance minus fee — the ceiling when adding stake. */
  available: BN;
};

/**
 * What `Max` fills in.
 *
 * Unbond is capped by what is bonded; add stake by what can actually leave the
 * transferable balance after the fee. They are different quantities, and
 * reading the wrong one is the difference between "unbond everything" and
 * "unbond your wallet balance".
 */
export function getMaxAmount(mode: AmountFlowMode, { activeStake, available }: MaxAmountParams): BN {
  if (mode === 'unbond') return activeStake;

  return available.isNeg() ? BN_ZERO : available;
}

type UnlockProjectionParams = {
  /** `null` when the chain cannot tell us when the current era started. */
  eraAnchor: EraAnchor | null;
  /** `staking.bondingDuration`, in eras. */
  bondingDuration: number | null;
  nowMs: number;
};

/**
 * When the unbonded funds become withdrawable, as unix ms.
 *
 * A chunk unbonded during era `N` unlocks at the start of era `N +
 * bondingDuration`, so the projection is the current era's start plus that many
 * full eras.
 *
 * Returns `null` rather than a guess when the anchor or the bonding duration is
 * missing — the callout then states the era count alone, which is the only
 * thing actually known.
 */
export function projectUnlockAt({ eraAnchor, bondingDuration, nowMs }: UnlockProjectionParams): number | null {
  if (!eraAnchor || !bondingDuration || bondingDuration <= 0) return null;
  if (eraAnchor.eraDurationMs <= 0) return null;

  const unlockAt = eraAnchor.eraStartMs + bondingDuration * eraAnchor.eraDurationMs;

  // A stale anchor (era rolled over while the modal was open) must never print a
  // date in the past — the funds cannot unlock before the user has signed.
  return Math.max(unlockAt, nowMs);
}

type UnlockingLimitParams = {
  /** Chunks still unbonding — those the ledger has yet to release. */
  chunkCount: number;
  /** `staking.maxUnlockingChunks`, `null` on runtimes that don't expose it. */
  maxUnlockingChunks: number | null;
};

/**
 * The ledger cannot hold another `unlocking` entry.
 *
 * `staking.unbond` fails outright once the ledger is full, and the only remedy
 * is withdrawing an already-unlocked chunk — so this blocks `Continue` instead
 * of letting the extrinsic fail on chain. Redeemable chunks are excluded on
 * purpose: `unbond` consolidates those first, so they free their slot.
 *
 * Unknown limit means no guard: refusing an operation on the strength of a
 * constant we failed to read would be worse than letting the node decide.
 */
export function hasReachedUnlockingLimit({ chunkCount, maxUnlockingChunks }: UnlockingLimitParams): boolean {
  if (maxUnlockingChunks === null || maxUnlockingChunks <= 0) return false;

  return chunkCount >= maxUnlockingChunks;
}
