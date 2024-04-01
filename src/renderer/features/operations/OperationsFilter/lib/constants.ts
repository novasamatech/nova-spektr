import { TransactionType } from '@entities/transaction/model/transaction';

export const UNKNOWN_TYPE = 'UNKNOWN_TYPE';

export const TransferTypes = [TransactionType.TRANSFER, TransactionType.ASSET_TRANSFER, TransactionType.ORML_TRANSFER];
