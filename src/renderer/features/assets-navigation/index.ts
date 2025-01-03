import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationTopLinksPipeline } from '@/features/app-shell';

export const assetsNavigationFeature = createFeature({
  name: 'assets/navigation',
  input: createStore({}),
  enable: $features.map(({ assets }) => assets),
});

assetsNavigationFeature.inject(navigationTopLinksPipeline, (items) => {
  return items.concat({
    order: 0,
    icon: 'asset',
    title: 'navigation.balancesLabel',
    link: Paths.ASSETS,
  });
});
