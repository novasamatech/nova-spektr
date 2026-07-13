import { type TxConfirmInfo } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';

export const enum Step {
  NONE,
  CONFIRM,
  SIGN,
  SUBMIT,
}

/** A request to claim vested tokens for one account on one chain. */
export type ClaimTarget = {
  chainId: string;
  accountId: AnyAccount['accountId'];
};

/**
 * What the sign and submit steps carry. The fee, the multisig deposit and the
 * validation errors are deliberately _not_ here: each costs a round trip and
 * arrives after the confirm is already on screen, so they live in their own
 * stores and are read live rather than snapshotted into this one.
 */
export type ClaimConfirm = TxConfirmInfo & {
  /** Amount released now by `vesting.vest()`. */
  claimable: string;
  /** Amount that keeps vesting after the claim. */
  stillLocked: string;
};
