import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { type BlockHeight, type ChainId } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';

import { type ExistingVestingSchedule } from './types';

export const vestingService = {
  getMinStartingBlock,
  getMinVestedTransfer,
  getMaxVestingSchedules,
  getExistingVestingSchedules,
};

function getMinStartingBlock(currentBlock: Record<ChainId, BlockHeight>, timelineChainId: ChainId): BN {
  const minStartingBlock = currentBlock[timelineChainId]!;
  return new BN(minStartingBlock);
}

function getMinVestedTransfer(api: ApiPromise): BN {
  return api.consts.vesting.minVestedTransfer.toBn();
}

function getMaxVestingSchedules(api: ApiPromise): BN {
  return api.consts.vesting.maxVestingSchedules.toBn();
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

    existingVestingSchedules[accountId] = schedules.map((schedule) => ({
      locked: schedule.locked.toBn(),
      perBlock: schedule.perBlock.toBn(),
      startingBlock: schedule.startingBlock.toBn(),
    }));
  }

  return existingVestingSchedules;
}
