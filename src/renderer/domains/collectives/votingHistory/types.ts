import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type Vote = {
  accountId: AccountId;
  referendumId: ReferendumId;
  votes: number;
  decision: 'Aye' | 'Nay';
};
