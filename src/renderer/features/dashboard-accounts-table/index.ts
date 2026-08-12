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

// Existing overview widgets occupy orders 0–3; leaving a gap up to 10 gives
// this widget room to split into several without renumbering its neighbors.
dashboardAccountsTableFeature.inject(dashboardWidgetsSlot, {
  order: 10,
  render: AccountsTableWidget,
  defaultSize: { w: 4, h: 6 },
  minSize: { w: 2, h: 4 },
});
