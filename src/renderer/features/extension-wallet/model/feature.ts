import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { isWeb } from '@/shared/lib/utils';

export const extensionWalletFeature = createFeature({
  name: 'polkadot extension/wallet',
  enable: $features.map(({ extensionWallets }) => extensionWallets && isWeb()),
});
