import { AccountID, ChainId } from './shared-kernel';

export const enum TransactionType {
  TRANSFER = 'transfer',
  ORML_TRANSFER = 'ormlTransfer',
  ASSET_TRANSFER = 'assetTransfer',
}

export type Transaction = {
  type: TransactionType;
  address: AccountID;
  chainId: ChainId;
  args: Record<string, any>;
};
