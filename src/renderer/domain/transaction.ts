export const enum TransactionType {
  TRANSFER = 'transfer',
}

export type Transaction = {
  type: TransactionType;
  address: string;
  chainId: string;
  args: Record<string, any>;
};
