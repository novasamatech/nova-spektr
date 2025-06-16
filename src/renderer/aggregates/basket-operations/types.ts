import { type ID } from '@/shared/core/types/general';
import { type Transaction } from '@/shared/core/types/transaction';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

export type BasketTransaction = {
  id: ID;
  initiatorAccountId: AccountId;
  coreTx: Transaction;
  route: AnyAccount[];
  error?: ChainError;
  createdAt: number;
};

export type BasketTransactionDraft = Omit<BasketTransaction, 'id'>;

export type ChainError = {
  type: 'chain';
  message: string;
  at: number;
};
