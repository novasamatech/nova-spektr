import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardWidgetsSlot } from '@/pages/Dashboard';

import { AccountsTableWidget } from './ui/AccountsTableWidget';

export const dashboardAccountsTableFeature = createFeature({
  name: 'dashboard/accounts-table',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

dashboardAccountsTableFeature.inject(dashboardWidgetsSlot, {
  order: 10,
  render: AccountsTableWidget,
  defaultSize: { w: 4, h: 6 },
  minSize: { w: 2, h: 4 },
});
