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
