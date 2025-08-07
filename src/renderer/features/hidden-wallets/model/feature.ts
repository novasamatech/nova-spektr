import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const hiddenWalletsFeature = createFeature({
  name: 'wallets/hidden',
  enable: $features.map(({ hiddenWallets }) => hiddenWallets),
});
