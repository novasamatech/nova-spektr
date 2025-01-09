import { type Transaction } from '@/shared/core';
import { type CollectivePalletsType } from '../_lib/types';

export type VotingTransaction = Transaction<{
  pallet: CollectivePalletsType;
  rank: number;
  poll: string;
  aye: boolean;
}>;
