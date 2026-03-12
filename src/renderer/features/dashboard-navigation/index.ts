import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { Paths } from '@/shared/routes';
import { navigationTopLinksPipeline } from '@/features/app-shell';

export const dashboardNavigationFeature = createFeature({
  name: 'dashboard/navigation',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

dashboardNavigationFeature.inject(navigationTopLinksPipeline, (items) => {
  return items.concat({
    order: -1,
    icon: 'dashboard',
    title: 'navigation.dashboardLabel',
    link: Paths.DASHBOARD,
  });
});
