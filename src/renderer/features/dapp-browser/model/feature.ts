import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';

export const dappBrowserFeature = createFeature({
  name: 'dapp/browser',
  enable: $features.map(({ dappBrowser }) => dappBrowser),
});
