import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const fellowshipRetentionFeature = createFeature({
  name: 'fellowship/retention',
  enable: $features.map(({ fellowship }) => fellowship),
});
