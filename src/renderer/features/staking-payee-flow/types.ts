import { type Address, type Asset, type Chain, type Wallet } from '@/shared/core';
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
 * The two destinations the flow can set. `Stash` and `Controller` exist on
 * chain but are not offered: the builder encodes only `Staked` and `Account`,
 * and paying to the stash is "transferable to this very account" anyway.
 */
export type PayeeOption = 'restake' | 'account';

/** What the form holds: which option, and the address under the second one. */
export type PayeeSelection = {
  option: PayeeOption;
  /** Typed or picked address; meaningless while `option` is `restake`. */
  address: string;
};

/**
 * What the caller hands over when a dashboard row asks to change its payee.
 *
 * Deliberately a structural subset of the dashboard's `PositionActionPayload`,
 * so the controller can wire
 * `positionActions.events.changeRewardDestinationRequested` straight into
 * `changeRewardDestinationRequested` without a mapping step.
 */
export type PayeeFlowTarget = {
  position: StakingPosition;
  chain: Chain;
  asset: Asset;
  /** The local account behind the position, `null` when there is none. */
  account: AnyAccount | null;
  /**
   * Wallet the account belongs to — drives the account chip's badge and name;
   * `null` with no local account.
   */
  wallet: Wallet | null;
  /**
   * How the caller expects this to be signed. `draft` opens the flow with draft
   * mode already on — the user should not have to discover the toggle for a
   * position nobody local can sign.
   */
  signingMode: SigningMode;
};

/**
 * What the sign and submit steps carry.
 *
 * The fee, the multisig deposit and the validation errors are deliberately
 * absent: each costs a round trip, arrives after the confirm is on screen and
 * is read live from its own store rather than snapshotted here.
 */
export type PayeeFlowConfirm = TxConfirmInfo & {
  /** `''` for Restake — the same encoding `buildSetPayee` reads. */
  destination: Address;
};
