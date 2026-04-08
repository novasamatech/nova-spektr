import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { Paths } from '@/shared/routes';
import { NavItem, navigationBottomLinksSlot } from '@/features/app-shell';

export const dashboardNavigationFeature = createFeature({
  name: 'dashboard/navigation',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

dashboardNavigationFeature.inject(navigationBottomLinksSlot, {
  order: -1,
  render: () => <NavItem icon="dashboard" title="navigation.dashboardLabel" link={Paths.DASHBOARD} />,
});
