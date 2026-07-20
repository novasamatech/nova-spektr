import { BN, BN_ZERO } from '@polkadot/util';

import { type Balance } from '@/shared/core';
import { transferableAmountBN, vestedLockedAmountBN } from '@/shared/lib/utils';

export type BalanceType = 'transferable' | 'reserved' | 'locked' | 'vested';

export const BALANCE_TYPES: BalanceType[] = ['transferable', 'reserved', 'locked', 'vested'];

/**
 * Builds a fully populated per-balance-type record from an initializer.
 */
export function makeByType<T>(init: (type: BalanceType) => T): Record<BalanceType, T> {
  // Object.fromEntries widens keys to string; BALANCE_TYPES covers every BalanceType, so the record is complete
  return Object.fromEntries(BALANCE_TYPES.map((type) => [type, init(type)])) as Record<BalanceType, T>;
}

/**
 * Splits a balance into raw amounts per balance type. Locked is everything that
 * is neither transferable nor reserved.
 *
 * Substrate balance locks overlap: the frozen amount is the MAX over lock
 * amounts, not their sum, so a clean partition is impossible when a vesting
 * lock coexists with other locks. Vesting takes priority — the vesting lock is
 * shown as "vested" so it never hides behind a bigger governance/staking lock,
 * and "locked" is the remainder. The overlap cost: funds covered by both locks
 * are labelled "vested" even though a non-vesting lock would still hold them
 * after vest().
 *
 * Vested is capped by the locked bucket and never touches "reserved": reserved
 * funds have their own causes (staking holds, deposits) that locks know nothing
 * about, so relabelling them "vested" would misattribute them. On
 * holdAndFreezes chains the part of a vesting lock that rides on reserved funds
 * therefore stays in "reserved".
 */
export function splitBalanceByType(balance: Balance): Record<BalanceType, BN> {
  const transferable = transferableAmountBN(balance);
  const total = balance.free.add(balance.reserved);

  const lockedTotal = BN.max(BN_ZERO, total.sub(transferable).sub(balance.reserved));
  const vested = BN.min(vestedLockedAmountBN(balance), lockedTotal);

  return {
    transferable,
    reserved: balance.reserved,
    locked: lockedTotal.sub(vested),
    vested,
  };
}

/**
 * The part of the vesting lock that {@link splitBalanceByType} cannot report —
 * the amount riding on reserved funds.
 *
 * `frozen` is a floor on `free + reserved`, not a claim on a slice of it (see
 * `AccountData::frozen` in pallet_balances, and `reducible_balance`, which
 * computes the untouchable part of free as `frozen - reserved`). So a vesting
 * lock and a hold can cover the same planck: a staker with 10k held and 5 still
 * vesting has that 5 already covered by the hold, and nothing in `free` is
 * immobilised by the vesting at all.
 *
 * The partition above therefore reports zero vested for that account — correct
 * for a bar whose segments must sum to the total, and a lie by omission to a
 * user the app is simultaneously telling they have active vesting schedules.
 * This is the missing amount, kept **outside** the partition: it must never be
 * added to a total or subtracted from `reserved` (which is a raw chain figure
 * the user can verify), only reported alongside.
 */
export function vestingOverlapBN(balance: Balance): BN {
  return BN.max(BN_ZERO, vestedTotalBN(balance).sub(splitBalanceByType(balance).vested));
}

/**
 * Everything under a vesting schedule, whether or not it restricts `free`.
 *
 * Capped at the balance: a lock can never exceed the funds it freezes, and a
 * stale lock read against a since-reduced balance would otherwise overstate.
 */
export function vestedTotalBN(balance: Balance): BN {
  return BN.min(vestedLockedAmountBN(balance), balance.free.add(balance.reserved));
}

/**
 * The buckets the **holdings lists and the cross-filter** read, as opposed to
 * the bar's: identical except that `vested` carries the whole vesting lock.
 *
 * The two differ because they answer different questions. A bar segment must be
 * a share of a total, so it can only show vesting that occupies space of its
 * own — hence {@link splitBalanceByType}, which caps it. A filter answers "which
 * assets, on which networks, are under a schedule", and there the coins covered
 * by a hold belong in the answer: they are just as vested, and leaving them out
 * made the Vested chip select nothing at all for a staking wallet.
 *
 * Consequence to keep in mind: these buckets do **not** sum to the balance —
 * `vested` overlaps `reserved`. Never feed them to anything that partitions.
 */
export function splitBalanceForHoldings(balance: Balance): Record<BalanceType, BN> {
  return { ...splitBalanceByType(balance), vested: vestedTotalBN(balance) };
}
