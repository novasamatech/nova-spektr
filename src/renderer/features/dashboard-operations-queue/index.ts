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
  order: 2,
  render: OperationsQueueWidget,
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
});
