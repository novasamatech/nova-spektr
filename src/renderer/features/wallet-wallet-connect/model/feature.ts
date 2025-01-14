import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const walletWalletConnectFeature = createFeature({
  name: 'wallet/wallet connect',
  enable: $features.map(f => f.walletConnect),
});
