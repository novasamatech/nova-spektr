import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardWidgetsSlot } from '@/pages/Dashboard';

import { PriceChartsWidget } from './ui/PriceChartsWidget';

export const dashboardPriceChartsFeature = createFeature({
  name: 'dashboard/price-charts',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

dashboardPriceChartsFeature.inject(dashboardWidgetsSlot, {
  order: 1,
  render: PriceChartsWidget,
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 1, h: 2 },
});
