import { AccountID, ChainId } from './shared-kernel';

export const enum TransactionType {
  TRANSFER = 'transfer',
  ORML_TRANSFER = 'ormlTransfer',
  ASSET_TRANSFER = 'assetTransfer',
  BOND = 'bond',
  NOMINATE = 'nominate',
  BATCH_ALL = 'batchAll',
}

export type Transaction = {
  type: TransactionType;
  address: AccountID;
  chainId: ChainId;
  args: Record<string, any>;
};
