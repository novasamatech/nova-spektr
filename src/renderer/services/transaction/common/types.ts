import { ApiPromise } from '@polkadot/api';

// =====================================================
// =========== ITransactionService interface ===========
// =====================================================

export type ITransactionService = {
  createPayload: (transaction: Transaction, api: ApiPromise) => Promise<Uint8Array>;
};

// =====================================================
// ======================= General =====================
// =====================================================

export const enum TransactionType {
  TRANSFER = 'transfer',
}

export type Transaction = {
  type: TransactionType;
  address: string;
  args: Record<string, any>;
};
