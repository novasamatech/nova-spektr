import { type ReferendumId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type Track = {
  id: string;
  value: string;
  description: string;
};

export type VotesToRemove = {
  referendum: ReferendumId;
  track: string;
  voter: AccountId;
};
