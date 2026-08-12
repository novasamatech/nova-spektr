import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { type TxConfirmInfo } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';
import { type StakingPosition } from '@/domains/staking';
import { type SigningMode } from '@/features/validator-selection';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

/**
 * The two actions this flow serves.
 *
 * They share one screen because they ask the user the same question — "how
 * much?" — against the same position, and differ only in which figure caps the
 * amount and what the callouts say about the consequence.
 */
export type AmountFlowMode = 'unbond' | 'addStake';

/**
 * What the caller hands over when a dashboard row asks for an amount.
 *
 * Deliberately a structural subset of the dashboard's `PositionActionPayload`,
 * so the controller can wire `positionActions.events.unbondRequested` straight
 * into `unbondRequested` without a mapping step.
 */
export type AmountFlowTarget = {
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

export type AmountFlowRequest = AmountFlowTarget & { mode: AmountFlowMode };

/**
 * What the sign and submit steps carry.
 *
 * The fee, the multisig deposit and the validation errors are deliberately
 * absent: each costs a round trip, arrives after the confirm is on screen and
 * is read live from its own store rather than snapshotted here.
 */
export type AmountFlowConfirm = TxConfirmInfo & {
  mode: AmountFlowMode;
  /** Amount being unbonded / added, in planck. */
  amount: string;
  /**
   * Active stake the position is left with (unbond) or ends up at (add stake),
   * planck.
   */
  resultingStake: string;
  /** The unbond is wrapped with `staking.chill` in a `BATCH_ALL`. */
  withChill: boolean;
};
