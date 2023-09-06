import { TransactionType } from '@renderer/entities/transaction';

export const MAX_WEIGHT = {
  refTime: '0',
  proofSize: '0',
};

export const OLD_MULTISIG_ARGS_AMOUNT = 6;

export const BOND_WITH_CONTROLLER_ARGS_AMOUNT = 3;

export const CONTROLLER_ARG_NAME = 'controller';

export const TransferTypes = [TransactionType.TRANSFER, TransactionType.ASSET_TRANSFER, TransactionType.ORML_TRANSFER];

export const XcmTypes = [
  TransactionType.XCM_TELEPORT,
  TransactionType.XCM_LIMITED_TRANSFER,
  TransactionType.POLKADOT_XCM_TELEPORT,
  TransactionType.POLKADOT_XCM_LIMITED_TRANSFER,
  TransactionType.XTOKENS_TRANSFER_MULTIASSET,
];
