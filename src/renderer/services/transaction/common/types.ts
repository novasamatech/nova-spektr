import { ApiPromise } from "@polkadot/api";

export const enum TransactionType {
  TRANSFER = 'transfer',
}

export type Transaction = {
  type: TransactionType;
  address: string;
  args: Record<string, any>;
}

export type ITransactionService = {
  createPayload: (transaction: Transaction, api: ApiPromise) => Promise<Uint8Array>;
};
