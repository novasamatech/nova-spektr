import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

export type Evidence = {
  wish: 'Promotion' | 'Retention';
  accountId: AccountId;
  hash: string;
  cid: string;
  content: string;
  summary: string;
};

export type EvidencePeriods = {
  minPromotionPeriod: BlockHeight[];
  demotionPeriod: BlockHeight[];
  offboardTimeout: BlockHeight;
};

export type CurrentMemberPeriod =
  | {
      type: 'Promotion';
      end: BlockHeight;
    }
  | {
      type: 'Retention';
      end: BlockHeight;
    };
