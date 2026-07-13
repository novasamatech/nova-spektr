import { type BN } from '@polkadot/util';

import { type TxConfirmInfo } from '@/shared/transactions';
import {
  type TransactionValidationBalanceError,
  type TransactionValidationFatalError,
  type TransactionValidationPermissionError,
} from '@/shared/ui-entities';
import { type AnyAccount } from '@/domains/network';

export type ClaimValidationError =
  | TransactionValidationBalanceError
  | TransactionValidationPermissionError
  | TransactionValidationFatalError;

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

export type ClaimConfirm = TxConfirmInfo & {
  fee: string;
  /** Amount released now by `vesting.vest()`. */
  claimable: string;
  /** Amount that keeps vesting after the claim. */
  stillLocked: string;
  hasMultisigAccount: boolean;
  /** Deposit the signatory reserves on a multisig route; zero otherwise. */
  multisigDeposit: BN;
  /**
   * Why the claim cannot be signed as configured — an unaffordable fee, an
   * unreservable multisig deposit, a wallet without permission. Empty when it
   * can. Blocks the sign button.
   */
  errors: ClaimValidationError[];
};
