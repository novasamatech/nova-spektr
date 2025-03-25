import { type Transaction } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

export type Member = {
  accountId: AccountId;
  rank: number;
};

export type CoreMember = Member & {
  isActive: boolean;
  lastPromotion: BlockHeight;
  lastProof: BlockHeight;
};

export type SetActiveTransaction = Transaction<{
  pallet: CollectivePalletsType;
  isActive: boolean;
}>;
