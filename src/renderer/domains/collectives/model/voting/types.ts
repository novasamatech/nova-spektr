import { type XOR } from '@/shared/core';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type Voting = XOR<{ aye: number }, { nay: number }> & {
  accountId: AccountId;
  referendumId: ReferendumId;
};
