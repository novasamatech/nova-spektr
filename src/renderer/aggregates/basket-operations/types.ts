import { type ID } from '@/shared/core/types/general';
import { type Transaction, type TxWrapper } from '@/shared/core/types/transaction';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type BasketTransaction = {
  id: ID;
  initiatorAccountId: AccountId;
  coreTx: Transaction;
  txWrappers: TxWrapper[];
  error?: ChainError;
  createdAt: number;
};

export type BasketTransactionDraft = Omit<BasketTransaction, 'id'>;

export type ChainError = {
  type: 'chain';
  message: string;
  at: number;
};
