import { type BN } from '@polkadot/util';

import { type ClaimAction } from '@/shared/api/governance';
import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type TxConfirmInfo } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';

export const enum Step {
  NONE,
  CONFIRM,
  SIGN,
  SUBMIT,
}

/**
 * One account's release on one chain, dispatched from the Unlock Schedule
 * widget.
 */
export type UnlockRequest = {
  chain: Chain;
  /** Who signs (or whose signing route is used). */
  initiator: AnyAccount;
  /**
   * Whose lock is released — equals `initiator.accountId` unless a payer
   * releases permissionlessly. `unlock(class, target)` takes any origin;
   * `remove_vote` does not, so a differing target is only valid for an
   * unlock-only release.
   */
  target: AccountId;
  actions: ClaimAction[];
  amount: BN;
};

/**
 * What the sign and submit steps carry. The fee, the multisig deposit and the
 * validation errors are deliberately _not_ here: each costs a round trip and
 * arrives after the confirm is already on screen, so they live in their own
 * stores and are read live rather than snapshotted into this one.
 */
export type UnlockConfirm = TxConfirmInfo & {
  /** Amount released by this operation. */
  amount: string;
  /** The account whose lock is released. */
  target: AccountId;
  /** How many calls the release is made of — one per track/referendum. */
  actionsCount: number;
};
