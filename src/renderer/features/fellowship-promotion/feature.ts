import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const fellowshipPromotionFeature = createFeature({
  name: 'fellowship/promotion',
  enable: $features.map(({ fellowship }) => fellowship),
});
