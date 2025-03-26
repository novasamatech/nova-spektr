import { type HexString, type Transaction } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

export type Evidence = {
  wish: 'Promotion' | 'Retention';
  accountId: AccountId;
  hash: HexString;
  cid: string;
  content: string;
};

export type EvidenceSummary = {
  hash: HexString;
  summary: string;
  accountId: AccountId;
  github?: {
    pullRequests: number | null;
    mergedPullRequests: number | null;
  } | null;
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

export type EvidenceTransaction = Transaction<{
  pallet: CollectivePalletsType;
  wish: 'Promotion' | 'Retention';
  evidence: HexString;
}>;
