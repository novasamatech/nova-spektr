import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { isWeb } from '@/shared/lib/utils';

export const polkadotExtensionWalletFeature = createFeature({
  name: 'polkadot extension/wallet',
  enable: $features.map(({ polkadotExtension }) => polkadotExtension && isWeb()),
});
