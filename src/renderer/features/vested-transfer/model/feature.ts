import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const vestedTransferFeature = createFeature({
  name: 'vested/transfer',
  enable: $features.map(({ vestedTransfer }) => vestedTransfer),
});
