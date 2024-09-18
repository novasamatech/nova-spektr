import { type AccountId } from '@/shared/polkadotjs-schemas';

export type Member = {
  accountId: AccountId;
  rank: number;
};
