import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const fellowshipTasksFeature = createFeature({
  name: 'fellowship/tasks',
  enable: $features.map(({ fellowship }) => fellowship),
});
