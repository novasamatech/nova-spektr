import { ID } from './general';
import { Transaction, TxWrapper } from './transaction';

export type BasketTransaction = {
  id: ID;
  initiatorWallet: ID;
  coreTx: Transaction;
  txWrappers: TxWrapper[];
  error?: BasketError;
  groupId?: number;
};

const enum ErrorType {
  CLIENT = 'client',
  CHAIN = 'chain',
}

interface BasketError {
  type: ErrorType;
  message: string;
}

export interface ChainError extends BasketError {
  type: ErrorType.CHAIN;
  dateCreated: number;
}

export interface ClientError extends BasketError {
  type: ErrorType.CLIENT;
  args?: Record<string, any>;
}
