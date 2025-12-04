import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const appCustomOperationsFeature = createFeature({
  name: 'app/custom-operations',
  enable: $features.map(({ appCustomOperations }) => appCustomOperations),
});
