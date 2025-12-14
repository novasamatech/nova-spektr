import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const multiTransferFeature = createFeature({
  name: 'transfer/multi',
  enable: $features.map(({ multiTransfer }) => multiTransfer),
});
