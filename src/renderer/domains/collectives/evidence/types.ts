import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

export type Evidence = {
  wish: 'Promotion' | 'Retention';
  accountId: AccountId;
  hash: string;
  cid: string;
  content: string;
};

export type EvidencePeriods = {
  minPromotionPeriod: BlockHeight[];
  demotionPeriod: BlockHeight[];
  offboardTimeout: BlockHeight;
};

export type CurrentMemberPeriod =
  | {
      type: 'Promotion';
      left: BlockHeight;
      end: BlockHeight;
    }
  | {
      type: 'Retention';
      left: BlockHeight;
      end: BlockHeight;
    };
