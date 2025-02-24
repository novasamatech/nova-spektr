import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const walletConnectWalletFeature = createFeature({
  name: 'wallet/wallet connect',
  enable: $features.map(f => f.walletConnect),
});
