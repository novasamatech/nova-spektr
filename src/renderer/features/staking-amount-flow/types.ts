import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { type TxConfirmInfo } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';
import { type StakingPosition } from '@/domains/staking';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
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
