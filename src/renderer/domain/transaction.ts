import { AccountID, ChainId } from './shared-kernel';

export const enum TransactionType {
  TRANSFER = 'transfer',
}

export type Transaction = {
  type: TransactionType;
  address: AccountID;
  chainId: ChainId;
  args: Record<string, any>;
};
