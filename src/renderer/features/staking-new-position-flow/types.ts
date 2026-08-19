import { type Address, type RewardsDestination, type Validator } from '@/shared/core';
import { type TxConfirmInfo } from '@/shared/transactions';

/**
 * `VALIDATORS` sits between the form and the confirm because a new position is
 * the one staking operation that has to answer two unrelated questions — how
 * much, and backed by whom. Every other dashboard flow answers one.
 */
export const enum Step {
  NONE,
  INIT,
  VALIDATORS,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

/**
 * What the sign and submit steps carry.
 *
 * The fee, the multisig deposit and the validation errors are deliberately
 * absent — each costs a round trip, arrives after the confirm is on screen and
 * is read live from its own store rather than snapshotted here. Same reasoning
 * as `staking-amount-flow`.
 */
export type NewPositionConfirm = TxConfirmInfo & {
  /** Amount being bonded, in planck. */
  amount: string;
  destinationType: RewardsDestination;
  /** Payout account, `null` when rewards are restaked. */
  payoutAddress: Address | null;
  validators: Validator[];
};
