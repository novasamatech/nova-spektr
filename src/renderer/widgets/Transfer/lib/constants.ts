import { AssetType } from '@shared/core';
import { TransactionType } from '@entities/transaction';

export const TransferType: Record<AssetType, TransactionType> = {
  [AssetType.ORML]: TransactionType.ORML_TRANSFER,
  [AssetType.STATEMINE]: TransactionType.ASSET_TRANSFER,
};
