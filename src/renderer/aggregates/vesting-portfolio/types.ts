import { type BN } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { type AccountId } from '@/shared/polkadotjs-schemas';
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
  /**
   * Tokens this schedule releases over the next 24 hours — what it _actually_
   * releases, not `perBlock × blocksPerDay`: zero while the start block is more
   * than a day away, and never more than what is still locked. `null` while the
   * timeline chain's block time is unknown.
   */
  perDayRate: BN | null;
  /**
   * Projected date the schedule fully vests; `null` when unknown or already
   * reached.
   */
  fullyUnlocksAt: Date | null;
  /**
   * Projected date the schedule starts releasing — the end of a cliff, or the
   * first unlock of a gradual schedule. `null` once it has started, or while
   * the block time is unknown.
   */
  startsAt: Date | null;
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
  /**
   * The key the schedules were read for. Always present — it is what we looked
   * up.
   */
  accountId: AccountId;
  /**
   * The local account behind that key, for display and (when
   * `claimable_signable`) for signing. `null` when the key is not ours — a
   * contact, or a hidden wallet's account — in which case `claimBlockReason`
   * says so.
   */
  account: AnyAccount | null;
  chainId: string;
  total: BN;
  stillLocked: BN;
  claimable: BN;
  /**
   * Tokens the account's schedules release over the next 24 hours, projected
   * from the timeline chain's expected block time. `null` while that block time
   * is not fetched yet.
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
