import { TransactionType } from '@/shared/core';

export const UNKNOWN_TYPE = 'UNKNOWN_TYPE';

export const TransferTypes = [
  TransactionType.TRANSFER,
  TransactionType.TRANSFER_ALL,
  TransactionType.ASSET_TRANSFER,
  TransactionType.ORML_TRANSFER,
];

export const enum TxStatus {
  VALID = 'VALID',
  FAILED = 'FAILED',
  UNAVAILABLE = 'UNAVAILABLE',
}
