import { type Address, type ReferendumId } from '@/shared/core';

export type Track = {
  id: string;
  value: string;
  description: string;
};

export type VotesToRemove = {
  referendum: ReferendumId;
  track: string;
  voter: Address;
};
