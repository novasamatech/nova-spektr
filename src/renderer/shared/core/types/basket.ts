import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type ID } from './general';
import { type Transaction, type TxWrapper } from './transaction';

export type BasketTransaction = {
  id: ID;
  initiatorAccountId: AccountId;
  coreTx: Transaction;
  txWrappers: TxWrapper[];
  error?: ChainError;
  createdAt: number;
};

export type ChainError = {
  type: 'chain';
  message: string;
  at: number;
};
