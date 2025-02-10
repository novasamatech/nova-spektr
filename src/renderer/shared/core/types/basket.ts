import { type ID } from './general';
import { type Transaction, type TxWrapper } from './transaction';

export type BasketTransaction = {
  id: ID;
  initiatorWallet: ID;
  coreTx: Transaction;
  txWrappers: TxWrapper[];
  error?: ChainError | ClientError;
  groupId?: number;
};

interface BasketError {
  type: 'chain' | 'client';
  message: string;
}

export interface ChainError extends BasketError {
  type: 'chain';
  dateCreated: number;
}

export interface ClientError extends BasketError {
  type: 'client';
  args?: Record<string, any>;
}
