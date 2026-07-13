import { type BN } from '@polkadot/util';

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

export type ClaimConfirm = TxConfirmInfo & {
  fee: string;
  /** Amount released now by `vesting.vest()`. */
  claimable: string;
  /** Amount that keeps vesting after the claim. */
  stillLocked: string;
  hasMultisigAccount: boolean;
  multisigDeposit: BN;
};
