import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

export type Member = {
  accountId: AccountId;
  rank: number;
};

export type CoreMember = Member & {
  isActive: boolean;
  lastPromotion: BlockHeight;
  lastProof: BlockHeight;
};
