import { type BN } from '@polkadot/util';

import { type Chain } from '@/shared/core';
import { type ExistingVestingScheduleMap } from '@/entities/vesting';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type VestingScheduleRaw = {
  target: string;
  locked: string;
  startingBlock: string;
  perBlock: string;
};

export enum FileErrors {
  INVALID_CSV_STRUCTURE = 'INVALID_CSV_STRUCTURE',
  INVALID_CSV_DATA = 'INVALID_CSV_DATA',
}

export enum RowErrors {
  INVALID_SS58_ADDRESS = 'INVALID_SS58_ADDRESS',
  MAX_VESTING_SCHEDULES_REACHED = 'MAX_VESTING_SCHEDULES_REACHED',
  LOCKED_NOT_POSITIVE_INT = 'LOCKED_NOT_POSITIVE_INT',
  LOCKED_TOO_LOW = 'LOCKED_TOO_LOW',
  START_BLOCK_NOT_POSITIVE_INT = 'START_BLOCK_NOT_POSITIVE_INT',
  START_BLOCK_IN_PAST = 'START_BLOCK_IN_PAST',
  START_BLOCK_TOO_HIGH = 'START_BLOCK_TOO_HIGH',
  PER_BLOCK_NOT_POSITIVE_INT = 'PER_BLOCK_NOT_POSITIVE_INT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

type RowIndex = number;

export type ErrorRecord = Record<RowIndex, RowErrors[]>;

export class VestingScheduleError extends Error {
  constructor(
    public code: FileErrors,
    public details?: ErrorRecord,
  ) {
    super(code);
    this.name = 'VestingScheduleError';
  }
}

export type VestingScheduleSchemaOptions = {
  chain: Chain;
  minStartingBlock: BN;
  minVestedTransfer: BN;
  maxVestingSchedules: BN;
  existingVestingSchedules: ExistingVestingScheduleMap;
};
