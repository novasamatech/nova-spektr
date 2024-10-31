import { type AccountId } from '@/shared/polkadotjs-schemas';

export type Vote = {
  accountId: AccountId;
  votes: number;
  decision: 'Aye' | 'Nay';
};
