import { type BN } from '@polkadot/util';

import { type Serializable } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

type Row<T> = {
  raw: string;
  parsed: T | null;
};

export type MultiTransferRow = {
  recipient: Row<AccountId>;
  amount: Row<BN>;
};

export type MultiTransferRowSerialized = Serializable<MultiTransferRow>;

export enum MultiTransferCsvError {
  STRUCTURE = 'STRUCTURE',
  DATA = 'DATA',
  TOO_MANY_ROWS = 'TOO_MANY_ROWS',
}

export enum MultiTransferFieldError {
  INVALID_SS58_ADDRESS = 'INVALID_SS58_ADDRESS',
  INVALID_VALUE = 'INVALID_VALUE',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  RECIPIENT_HAS_LESS_THAN_ED = 'RECIPIENT_HAS_LESS_THAN_ED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum MultiTransferFieldWarning {
  DUPLICATE_RECIPIENT = 'DUPLICATE_RECIPIENT',
}

export type RowIndex = number;
export type RowValues = keyof MultiTransferRow;
export type ValidationIssue = {
  row: RowIndex;
  path: RowValues;
  severity: 'error' | 'warning';
  message: MultiTransferFieldError | MultiTransferFieldWarning;
};
