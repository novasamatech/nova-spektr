import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationTopLinks } from '@/features/app-shell';

export const assetsNavigationFeature = createFeature({
  name: 'Assets navigation',
  input: createStore({}),
  enable: $features.map(({ assets }) => assets),
});

assetsNavigationFeature.inject(navigationTopLinks, (items) => {
  return items.concat({ order: 0, icon: 'asset', title: 'navigation.balancesLabel', link: Paths.ASSETS });
});
