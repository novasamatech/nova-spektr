import { type BN } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { type AnyAccount } from '@/domains/network';
import { type ComputedVestingSchedule } from '@/domains/vesting';

import { type ClaimBlockReason } from './lib/resolveClaimAccount';

/**
 * What the vesting block may say about the wallet's vesting.
 *
 * - `loading` — we have not yet looked everywhere; nothing may be claimed about
 *   the absence of vesting.
 * - `empty` — every chain that could hold vesting has reported, and none does.
 * - `ready` — at least one schedule is known.
 */
export type VestingStatus = 'loading' | 'empty' | 'ready';

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

/** Wallet-wide totals shown on the dashboard callout and the schedules modal. */
export type VestingSummary = {
  totalVestingFiat: BigNumber;
  claimableFiat: BigNumber;
  perDayFiat: BigNumber;
  schedulesCount: number;
  lastUnlockDate: Date | null;
  hasClaim: boolean;
};

export const EMPTY_SUMMARY: VestingSummary = {
  totalVestingFiat: new BigNumber(0),
  claimableFiat: new BigNumber(0),
  perDayFiat: new BigNumber(0),
  schedulesCount: 0,
  lastUnlockDate: null,
  hasClaim: false,
};
