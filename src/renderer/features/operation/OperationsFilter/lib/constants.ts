import { TransactionType } from '@renderer/entities/transaction/model/transaction';

export const UNKNOWN_TYPE = 'UNKNOWN_TYPE';

export const TransferTypes = [TransactionType.TRANSFER, TransactionType.ASSET_TRANSFER, TransactionType.ORML_TRANSFER];

export const XcmTypes = [
  TransactionType.XCM_TELEPORT,
  TransactionType.XCM_LIMITED_TRANSFER,
  TransactionType.POLKADOT_XCM_TELEPORT,
  TransactionType.POLKADOT_XCM_LIMITED_TRANSFER,
  TransactionType.XTOKENS_TRANSFER_MULTIASSET,
];
