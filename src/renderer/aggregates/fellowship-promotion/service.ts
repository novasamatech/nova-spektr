import { MS_PER_DAY, PROMOTION_SUBMISSION_THRESHOLD_DAYS } from './constants';

export const getPromotionThresholdBlocks = (blockTimeMs: number): number => {
  return Math.max(1, Math.ceil((PROMOTION_SUBMISSION_THRESHOLD_DAYS * MS_PER_DAY) / blockTimeMs));
};

export const getPromotionGreenStartBlock = (from: number, to: number, blockTimeMs: number): number => {
  const thresholdBlocks = getPromotionThresholdBlocks(blockTimeMs);
  return Math.max(from, to - thresholdBlocks);
};
