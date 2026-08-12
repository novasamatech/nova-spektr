import { type Asset, type Chain, type Validator, type Wallet } from '@/shared/core';
import { type TxConfirmInfo } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';
import { type StakingPosition } from '@/domains/staking';
import { type SigningMode } from '@/features/validator-selection';

export const enum Step {
  NONE,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

/**
 * The two staking actions that ask the user for nothing.
 *
 * Everything they need is decided before the flow opens — the validator set
 * comes from the picker, the redeemable figure from the ledger — so both go
 * straight to the confirm instead of hosting an input step of their own.
 */
export type ConfirmFlowMode = 'changeValidators' | 'redeem';

type PositionTarget = {
  position: StakingPosition;
  chain: Chain;
  asset: Asset;
  /** The local account behind the position, `null` when there is none. */
  account: AnyAccount | null;
  /** Wallet the account belongs to — drives the account chip's badge and name. */
  wallet?: Wallet | null;
  /**
   * How the caller expects this to be signed. `draft` opens the flow with draft
   * mode already on — the user should not have to discover the toggle for a
   * position nobody local can sign.
   */
  signingMode: SigningMode;
};

/**
 * What the caller hands over for a validator change.
 *
 * Deliberately a structural subset of the dashboard's
 * `NominationsChangePayload`, so the controller can wire
 * `positionActions.events.nominationsChangeRequested` straight into
 * `changeValidatorsRequested` without a mapping step.
 */
export type ChangeValidatorsTarget = PositionTarget & {
  /** The set the user picked, in the order the picker returned it. */
  validators: Validator[];
};

export type RedeemTarget = PositionTarget & {
  /** Planck already unlocked and withdrawable. */
  amount: string;
};

/** The snapshot the flow runs on, whichever entry point produced it. */
export type ConfirmFlowRequest = PositionTarget & {
  mode: ConfirmFlowMode;
  /** The picked set; always empty for a redeem. */
  validators: Validator[];
  /** Planck the redeem withdraws; `'0'` for a validator change. */
  amount: string;
};

/**
 * What the sign and submit steps carry.
 *
 * The fee, the multisig deposit and the validation errors are deliberately
 * absent: each costs a round trip, arrives after the confirm is on screen and
 * is read live from its own store rather than snapshotted here.
 */
export type ConfirmFlowConfirm = TxConfirmInfo & {
  mode: ConfirmFlowMode;
  amount: string;
  validators: Validator[];
};
