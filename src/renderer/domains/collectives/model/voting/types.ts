import { type Transaction, type XOR } from '@/shared/core';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../../lib/types';

export type Voting = XOR<{ aye: number }, { nay: number }> & {
  accountId: AccountId;
  referendumId: ReferendumId;
};

export type VotingTransaction = Transaction<{
  pallet: CollectivePalletsType;
  poll: string;
  aye: boolean;
}>;
