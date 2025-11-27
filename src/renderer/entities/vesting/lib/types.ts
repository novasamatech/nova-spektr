import { type BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';

export type VestingScheduleRaw = {
  target: AccountId;
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

export type ExistingVestingSchedule = Record<AccountId, Omit<VestingSchedule, 'target'>[]>;

export enum VestingCsvError {
  STRUCTURE = 'STRUCTURE',
  DATA = 'DATA',
}

export enum VestingFieldError {
  INVALID_SS58_ADDRESS = 'INVALID_SS58_ADDRESS',
  MAX_VESTING_SCHEDULES_REACHED = 'MAX_VESTING_SCHEDULES_REACHED',
  MIN_VESTED_TRANSFER = 'MIN_VESTED_TRANSFER',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_VALUE = 'INVALID_VALUE',
}

export enum VestingFieldWarning {
  START_BLOCK_IN_PAST = 'START_BLOCK_IN_PAST',
  START_BLOCK_FAR_IN_FUTURE = 'START_BLOCK_FAR_IN_FUTURE',
  UNLOCK_RATE_SLOW = 'UNLOCK_RATE_SLOW',
}

export type RowIndex = number;
export type RowValues = 'target' | 'locked' | 'startingBlock' | 'perBlock';
export type ValidationIssue = {
  row: RowIndex;
  path: RowValues;
  severity: 'error' | 'warning';
  message: VestingFieldError | VestingFieldWarning;
};
