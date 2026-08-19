import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardGovernanceSlot } from '@/pages/Dashboard';

import { GovernanceOverviewWidget } from './ui/GovernanceOverviewWidget';
import { ReferendumsWidget } from './ui/ReferendumsWidget';
import { UnlockScheduleWidget } from './ui/UnlockScheduleWidget';

const enableFlag = $features.map(({ dashboard }) => dashboard);

export const dashboardGovernanceFeature = createFeature({
  name: 'dashboard/governance',
  input: createStore({}),
  enable: enableFlag,
});

dashboardGovernanceFeature.inject(dashboardGovernanceSlot, {
  order: 0,
  render: GovernanceOverviewWidget,
  defaultSize: { w: 2, h: 4 },
  minSize: { w: 1, h: 2 },
});

export const dashboardUnlockScheduleFeature = createFeature({
  name: 'dashboard/unlock-schedule',
  input: createStore({}),
  enable: enableFlag,
});

dashboardUnlockScheduleFeature.inject(dashboardGovernanceSlot, {
  order: 1,
  render: UnlockScheduleWidget,
  defaultSize: { w: 2, h: 4 },
  minSize: { w: 1, h: 2 },
});

export const dashboardReferendumsFeature = createFeature({
  name: 'dashboard/referendums',
  input: createStore({}),
  enable: enableFlag,
});

dashboardReferendumsFeature.inject(dashboardGovernanceSlot, {
  order: 2,
  render: ReferendumsWidget,
  defaultSize: { w: 4, h: 5 },
  minSize: { w: 2, h: 3 },
});
