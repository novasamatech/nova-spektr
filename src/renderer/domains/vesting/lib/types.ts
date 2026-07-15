import { type BN } from '@polkadot/util';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type VestingScheduleRaw = {
  target: AccountId;
  locked: string;
  startingBlock: string;
  perBlock: string;
  unlockedAtStartBlock?: string;
};

export type VestingSchedule = {
  target: AccountId;
  locked: BN;
  startingBlock: BN;
  perBlock: BN;
  unlockedAtStartBlock?: BN;
};

export type ExistingVestingSchedule = Record<AccountId, Omit<VestingSchedule, 'target'>[]>;

export enum VestingCsvError {
  STRUCTURE = 'STRUCTURE',
  DATA = 'DATA',
  EMPTY = 'EMPTY',
}

export enum VestingFieldError {
  INVALID_SS58_ADDRESS = 'INVALID_SS58_ADDRESS',
  MAX_VESTING_SCHEDULES_REACHED = 'MAX_VESTING_SCHEDULES_REACHED',
  MIN_VESTED_TRANSFER = 'MIN_VESTED_TRANSFER',
  CLIFF_MIN_VESTED_TRANSFER = 'CLIFF_MIN_VESTED_TRANSFER',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_VALUE = 'INVALID_VALUE',
}

export enum VestingFieldWarning {
  START_BLOCK_IN_PAST = 'START_BLOCK_IN_PAST',
  START_BLOCK_FAR_IN_FUTURE = 'START_BLOCK_FAR_IN_FUTURE',
  UNLOCK_RATE_SLOW = 'UNLOCK_RATE_SLOW',
  DUPLICATE_TARGET = 'DUPLICATE_TARGET',
}

export type RowIndex = number;
export type RowValues = 'target' | 'locked' | 'startingBlock' | 'perBlock' | 'unlockedAtStartBlock';
export type ValidationIssue = {
  row: RowIndex;
  path: RowValues;
  severity: 'error' | 'warning';
  message: VestingFieldError | VestingFieldWarning;
};

/**
 * A single on-chain vesting schedule as stored by pallet_vesting, keyed by
 * chain and account by {@link VestingSchedulesMap}.
 */
export type VestingScheduleInfo = {
  locked: BN;
  perBlock: BN;
  startingBlock: BN;
};

export type ChainVestingSchedules = Record<AccountId, VestingScheduleInfo[]>;

/** Raw vesting schedules grouped by chain then account. */
export type VestingSchedulesMap = Record<ChainId, ChainVestingSchedules>;

/**
 * Current on-chain `VESTING` balance lock (planks) per account. This is the
 * amount `vesting.vest()` would release, so it — not the balance store — is the
 * source of truth for the claimable figure.
 */
export type ChainVestingLocks = Record<AccountId, BN>;

/** Vesting locks grouped by chain then account. */
export type VestingLocksMap = Record<ChainId, ChainVestingLocks>;

/**
 * Vesting schedules and the accompanying live vesting locks, fetched together
 * so the claimable amount stays correct even when the chain's balances aren't
 * part of the global balance subscription.
 */
export type VestingData = {
  schedules: VestingSchedulesMap;
  locks: VestingLocksMap;
};

/** A schedule enriched with the amounts derived at the current block. */
export type ComputedVestingSchedule = VestingScheduleInfo & {
  /** Amount still subject to vesting at the current block. */
  lockedNow: BN;
  /** Amount that has vested so far (`locked - lockedNow`). */
  vestedSoFar: BN;
  /** Block at which the schedule is fully vested. */
  endBlock: BN;
  /**
   * The whole amount is released in a single block (`perBlock >= locked`) — the
   * shape of a cliff, and the only schedule for which "unlocking per day" is
   * meaningless.
   *
   * This is a property of the schedule, not of where the chain has got to. A
   * schedule whose start block simply lies in the future is _not_ a cliff; it
   * is a gradual schedule that has yet to begin — see {@link hasStarted}.
   */
  isCliff: boolean;
  /** The chain has reached `startingBlock`, so the schedule is releasing. */
  hasStarted: boolean;
};

/** Aggregated vesting figures for a single account on a single chain. */
export type AccountVesting = {
  /** Total original locked across all schedules. */
  total: BN;
  /** Amount still subject to vesting right now (`Σ lockedNow`). */
  stillLocked: BN;
  /**
   * Amount released by calling `vesting.vest()` right now (`max(0, lock -
   * stillLocked)`).
   */
  claimable: BN;
  /** The latest block at which any schedule fully vests. */
  endBlock: BN;
  /** Per-schedule computed figures. */
  schedules: ComputedVestingSchedule[];
};
