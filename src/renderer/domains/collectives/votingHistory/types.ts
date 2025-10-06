import { type ChainId } from '@/shared/core';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

export type Vote = {
  pallet: CollectivePalletsType;
  chainId: ChainId;
  accountId: AccountId;
  referendumId: ReferendumId;
  votes: number;
  decision: 'Aye' | 'Nay';
};

export type VotingRating = 'NotGood' | 'Controversial' | 'Good';
