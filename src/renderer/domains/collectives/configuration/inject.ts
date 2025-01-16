import { createPipeline } from '@/shared/di';
import { type CollectivePalletsType } from '../_lib/types';

export const calculateVoteWeightPipeline = createPipeline<
  number,
  { pallet: CollectivePalletsType; excessRank: number }
>();
