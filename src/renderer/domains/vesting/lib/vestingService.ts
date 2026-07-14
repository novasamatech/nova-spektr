import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { type BlockHeight, type ChainId, LockTypes } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type ChainVestingLocks, type ChainVestingSchedules, type ExistingVestingSchedule } from './types';

export const vestingService = {
  getMinStartingBlock,
  getMinVestedTransfer,
  getMaxVestingSchedules,
  getExistingVestingSchedules,
  subscribeSchedulesForAccounts,
  subscribeVestingLocksForAccounts,
};

/**
 * The lowest block a new schedule may sensibly start at — the timeline chain's
 * current head.
 *
 * `null` while that height is unknown: before the block poll's first tick, or
 * for as long as the timeline chain (the relay, for a migrated Asset Hub) is
 * disconnected or disabled. Asserting the height instead would hand callers
 * `new BN(undefined)`, which BN quietly coerces to zero — and a floor of zero
 * passes every starting block there is, turning the past-block warning off
 * without a word.
 */
function getMinStartingBlock(currentBlock: Record<ChainId, BlockHeight>, timelineChainId: ChainId): BN | null {
  const minStartingBlock = currentBlock[timelineChainId];

  return minStartingBlock == null ? null : new BN(minStartingBlock);
}

function getMinVestedTransfer(api: ApiPromise): BN {
  return api.consts.vesting.minVestedTransfer.toBn();
}

function getMaxVestingSchedules(api: ApiPromise): BN {
  return api.consts.vesting.maxVestingSchedules.toBn();
}

/**
 * Subscribes to the vesting schedules for a set of accounts on one chain via a
 * batched `vesting.vesting.multi` query. Accounts must already be
 * scheme-matched to the chain. Calls back with the parsed schedules on the
 * initial read and on every change (e.g. after `vesting.vest()` prunes a
 * fully-vested schedule); accounts without a schedule are omitted.
 */
function subscribeSchedulesForAccounts(
  api: ApiPromise,
  accountIds: AccountId[],
  callback: (schedules: ChainVestingSchedules) => void,
) {
  return api.query.vesting.vesting.multi(accountIds, entries => {
    const result: ChainVestingSchedules = {};

    for (const [index, option] of entries.entries()) {
      const schedules = option.unwrapOr([]);
      if (schedules.length === 0) continue;

      result[accountIds[index]!] = schedules.map(schedule => ({
        locked: schedule.locked.toBn(),
        perBlock: schedule.perBlock.toBn(),
        startingBlock: schedule.startingBlock.toBn(),
      }));
    }

    callback(result);
  });
}

/**
 * Subscribes to the live `VESTING` balance lock for each account via a batched
 * `balances.locks.multi` query. This is the amount still frozen by the vesting
 * schedule — exactly what `vesting.vest()` releases — and, unlike the aggregate
 * `frozen` field, it isn't masked by a larger co-existing lock (e.g. a
 * conviction-voting lock). Calls back on the initial read and whenever the lock
 * changes (it drops when the vested amount is released); accounts with no
 * vesting lock are omitted.
 */
function subscribeVestingLocksForAccounts(
  api: ApiPromise,
  accountIds: AccountId[],
  callback: (locks: ChainVestingLocks) => void,
) {
  return api.query.balances.locks.multi(accountIds, entries => {
    const result: ChainVestingLocks = {};

    for (const [index, locks] of entries.entries()) {
      const vestingLock = [...locks].find(lock => lock.id.toString() === LockTypes.VESTING);
      if (vestingLock) {
        result[accountIds[index]!] = vestingLock.amount.toBn();
      }
    }

    callback(result);
  });
}

async function getExistingVestingSchedules(api: ApiPromise) {
  const vestingEntries = await api.query.vesting.vesting.entries();
  const existingVestingSchedules: ExistingVestingSchedule = {};

  for (const [key, value] of vestingEntries) {
    const schedules = value.unwrapOr([]);
    if (schedules.length === 0) {
      continue;
    }

    const accountId = toAccountId(key.args[0].toString());

    existingVestingSchedules[accountId] = schedules.map(schedule => ({
      locked: schedule.locked.toBn(),
      perBlock: schedule.perBlock.toBn(),
      startingBlock: schedule.startingBlock.toBn(),
    }));
  }

  return existingVestingSchedules;
}
