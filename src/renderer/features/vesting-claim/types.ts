import { type BN } from '@polkadot/util';

import { type TxConfirmInfo } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';
import { type ComputedVestingSchedule } from '@/domains/vesting';

import { type ClaimBlockReason } from './lib/resolveClaimAccount';

export const enum Step {
  NONE,
  CONFIRM,
  SIGN,
  SUBMIT,
}

/** A single vesting schedule prepared for display. */
export type ScheduleView = ComputedVestingSchedule & {
  index: number;
  /** Whether the schedule is still locked in a cliff (nothing vested yet). */
  inCliff: boolean;
  /**
   * Tokens this schedule unlocks per day. `null` while the timeline chain's
   * block time is unknown or once the schedule has fully vested.
   */
  perDayRate: BN | null;
  /**
   * Projected date the schedule fully vests; `null` when unknown or already
   * reached.
   */
  fullyUnlocksAt: Date | null;
  /**
   * Projected date the cliff ends (start block reached); `null` when unknown or
   * not in cliff.
   */
  cliffEndsAt: Date | null;
  /**
   * Portion of the account's claimable attributed to this schedule — a
   * display-level split; `vesting.vest()` still claims per account.
   */
  claimableNow: BN;
};

/**
 * Aggregated vesting for one account on one chain, enriched for the UI. Amounts
 * stay token-denominated (BN); fiat is derived at render time.
 */
export type AccountVestingView = {
  key: string;
  account: AnyAccount;
  chainId: string;
  total: BN;
  stillLocked: BN;
  claimable: BN;
  /** Tokens unlocked per block, summed across still-vesting schedules. */
  perBlockRate: BN;
  /**
   * Tokens unlocked per day, derived from the timeline chain's expected block
   * time. `null` while that block time is not fetched yet.
   */
  perDayRate: BN | null;
  endBlock: BN;
  schedules: ScheduleView[];
  /**
   * Whether the account can be claimed from the current wallet (not watch-only
   * / contact).
   */
  claimable_signable: boolean;
  /**
   * Why claiming is unavailable; `null` when it is available. Drives the hint
   * shown in place of the claim button.
   */
  claimBlockReason: ClaimBlockReason | null;
};

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
