import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { type TxConfirmInfo } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';
import { type UnclaimedPayout } from '@/domains/staking';
import { type SigningMode } from '@/features/validator-selection';

export const enum Step {
  NONE,
  CONFIRM,
  SIGN,
  SUBMIT,
}

/**
 * One account's unclaimed rewards, as the caller sees them.
 *
 * The payouts are passed through verbatim — `era`, `validator` and especially
 * `page` are what `staking.payout_stakers_by_page` is built from, and a page
 * index the caller resolved from real exposure must not be re-derived here.
 */
export type ClaimRequest = {
  chain: Chain;
  asset: Asset;
  account: AnyAccount;
  wallet: Wallet;
  payouts: UnclaimedPayout[];
  /**
   * How the caller expects the claim to be signed — the **payer's** mode, not
   * the nominator's. Payouts are permissionless, so a producer that resolved a
   * signable payer sends `local` even for an address-book nominator; `draft`
   * means the whole session has no signable payer.
   */
  signingMode: SigningMode;
};

/**
 * One transaction: at most `MAX_PAYOUT_CALLS_PER_BATCH` payout calls for one
 * account. An account with more unclaimed payouts than the cap produces several
 * plans, each of which becomes its own extrinsic.
 */
export type ClaimPlan = {
  chain: Chain;
  asset: Asset;
  account: AnyAccount;
  wallet: Wallet;
  payouts: UnclaimedPayout[];
  /** 0-based index of this batch among the batches of the same account. */
  batchIndex: number;
  /** How many batches the account was split into. */
  batchCount: number;
};

/**
 * What the sign and submit steps carry. Fee, multisig deposit and validation
 * errors are deliberately absent: each costs a round trip and arrives after the
 * confirm is already on screen, so they live in their own stores and are read
 * live rather than snapshotted here.
 */
export type ClaimRewardsConfirm = TxConfirmInfo & {
  /** Planck sum of the payouts inside this transaction. */
  amount: string;
  /** How many `payout_stakers_by_page` calls this transaction carries. */
  payoutCount: number;
};

/** What was submitted, for whoever wants to react to a landed claim. */
export type ClaimedRewards = {
  chain: Chain;
  asset: Asset;
  /** Planck sum across every account in the session. */
  total: string;
  claims: {
    account: AnyAccount;
    payouts: UnclaimedPayout[];
    /** Planck sum for this account. */
    amount: string;
  }[];
};
