import { type BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';

export type MultiTransferRowRaw = {
  recipient: string;
  amount: string;
};

export type MultiTransferRow = {
  recipient: AccountId;
  amount: BN;
};

export enum MultiTransferCsvError {
  STRUCTURE = 'STRUCTURE',
  DATA = 'DATA',
}

export enum MultiTransferFieldError {
  INVALID_SS58_ADDRESS = 'INVALID_SS58_ADDRESS',
  INVALID_VALUE = 'INVALID_VALUE',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export type RowIndex = number;
export type RowValues = 'recipient' | 'amount';
export type ValidationIssue = {
  row: RowIndex;
  path: RowValues;
  severity: 'error';
  message: MultiTransferFieldError;
};
