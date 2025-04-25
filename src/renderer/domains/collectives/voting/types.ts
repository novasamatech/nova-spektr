import { type HexString, type Transaction } from '@/shared/core';
import { type CollectivePalletsType } from '../_lib/types';

export type VotingTransaction = Transaction<{
  pallet: CollectivePalletsType;
  rank: number;
  poll: number;
  aye: boolean;
}>;

export type EvidenceVotingTransaction = Transaction<{
  pallet: CollectivePalletsType;
  proposal: HexString;
  track: string;
  after: number;
  poll: number;
  aye: boolean;
}>;
