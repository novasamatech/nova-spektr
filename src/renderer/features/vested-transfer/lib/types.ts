import { type BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';

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

export type VestingSchedule = {
  target: AccountId;
  locked: BN;
  startingBlock: BN;
  perBlock: BN;
};

export enum VestingScheduleFileErrors {
  INVALID_CSV_STRUCTURE = 'INVALID_CSV_STRUCTURE',
  INVALID_CSV_DATA = 'INVALID_CSV_DATA',
  CHAIN_NOT_SELECTED = 'CHAIN_NOT_SELECTED',
}

export enum VestingScheduleRowErrors {
  INVALID_SS58_ADDRESS = 'INVALID_SS58_ADDRESS',
  LOCKED_NOT_POSITIVE_INT = 'LOCKED_NOT_POSITIVE_INT',
  START_BLOCK_NOT_POSITIVE_INT = 'START_BLOCK_NOT_POSITIVE_INT',
  PER_BLOCK_NOT_POSITIVE_INT = 'PER_BLOCK_NOT_POSITIVE_INT',
  START_BLOCK_IN_PAST = 'START_BLOCK_IN_PAST',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export type VestingScheduleErrorRecord = Record<VestingScheduleRowErrors, number[]>;

export class VestingScheduleError extends Error {
  constructor(
    public code: VestingScheduleFileErrors,
    public details?: VestingScheduleErrorRecord,
  ) {
    super(code);
    this.name = 'VestingScheduleError';
  }
}
