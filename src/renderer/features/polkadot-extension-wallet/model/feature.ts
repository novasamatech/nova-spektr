import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const polkadotExtensionWalletFeature = createFeature({
  name: 'polkadot extension/wallet',
  enable: $features.map(({ polkadotExtension }) => polkadotExtension),
});
