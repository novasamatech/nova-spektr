// TODO: Fix imports
import { Transaction, TxWrapper } from '@entities/transaction';
import { ID } from './general';

export type BasketTransaction = {
  id: ID;
  initiatorWallet: ID;
  coreTx: Transaction;
  txWrappers: TxWrapper[];
  error?: Error;
  groupId?: number;
};

const enum ErrorType {
  CLIENT = 'client',
  CHAIN = 'chain',
}

type ChainError = {
  type: ErrorType;
  message: string;
};

type ClientError = {
  type: ErrorType;
  message: string;
  args?: Record<string, any>;
};

type Error = ChainError | ClientError;
