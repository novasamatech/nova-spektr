import { type ChainId, type HexString, type Transaction } from '@/shared/core';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

export type Evidence = {
  pallet: CollectivePalletsType;
  chainId: ChainId;
  wish: 'Promotion' | 'Retention';
  accountId: AccountId;
  hash: HexString;
};

export type EvidenceContent = {
  pallet: CollectivePalletsType;
  chainId: ChainId;
  wish: 'Promotion' | 'Retention';
  accountId: AccountId;
  hash: HexString;
  cid: string;
  content: string;
};

export type EvidenceSummary = {
  pallet: CollectivePalletsType;
  chainId: ChainId;
  hash: HexString;
  summary: string;
  accountId: AccountId;
  github?: {
    pullRequests: number | null;
    mergedPullRequests: number | null;
  } | null;
};

export type EvidencePeriods = {
  pallet: CollectivePalletsType;
  chainId: ChainId;
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

export type ReferendumWithEvidence = {
  referendumId: ReferendumId;
  evidence: { hash: HexString }[];
  pallet: CollectivePalletsType;
  chainId: ChainId;
};
