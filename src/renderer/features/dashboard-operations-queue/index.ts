import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardWidgetsSlot } from '@/pages/Dashboard';

import { OperationsQueueWidget } from './ui/OperationsQueueWidget';

export const dashboardOperationsQueueFeature = createFeature({
  name: 'dashboard/operationsQueue',
  input: createStore({}),
  enable: $features.map(({ operationsQueueWidget }) => operationsQueueWidget),
});

dashboardOperationsQueueFeature.inject(dashboardWidgetsSlot, {
  order: 3,
  label: 'dashboard.operationsQueue.title',
  render: OperationsQueueWidget,
  defaultSize: { w: 2, h: 4 },
  minSize: { w: 2, h: 2 },
});
