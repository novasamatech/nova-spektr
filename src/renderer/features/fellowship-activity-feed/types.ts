import { type ReferendumId } from '@/shared/pallet/referenda';

export type ReferendumDetails = {
  referendumId: ReferendumId;
  targetAccountId: string;
  targetName?: string;
  targetRank: number;
  isPromotion: boolean;
  isRetention: boolean;
};
