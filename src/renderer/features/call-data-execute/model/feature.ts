import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const callDataExecuteFeature = createFeature({
  name: 'call-data/execute',
  enable: $features.map(({ callData }) => callData),
});
