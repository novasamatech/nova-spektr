import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

export type Member = {
  accountId: AccountId;
  rank: number;
  isActive: boolean;
  lastPromotion: BlockHeight;
  lastProof: BlockHeight;
};
