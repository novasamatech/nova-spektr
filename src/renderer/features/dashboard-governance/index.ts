import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardGovernanceSlot, defineWidget } from '@/pages/Dashboard';

import { GovernanceLocksWidget } from './ui/GovernanceLocksWidget';
import { GovernanceOverviewWidget } from './ui/GovernanceOverviewWidget';
import { ReferendumsWidget } from './ui/ReferendumsWidget';
import { UnlockScheduleWidget } from './ui/UnlockScheduleWidget';

const enableFlag = $features.map(({ dashboard }) => dashboard);

export const dashboardGovernanceFeature = createFeature({
  name: 'dashboard/governance',
  input: createStore({}),
  enable: enableFlag,
});

dashboardGovernanceFeature.inject(
  dashboardGovernanceSlot,
  defineWidget({
    order: 2,
    label: 'dashboard.governanceOverview.title',
    render: GovernanceOverviewWidget,
    defaultSize: { w: 2, h: 4 },
    minSize: { w: 1, h: 2 },
  }),
);

export const dashboardUnlockScheduleFeature = createFeature({
  name: 'dashboard/unlock-schedule',
  input: createStore({}),
  enable: enableFlag,
});

dashboardUnlockScheduleFeature.inject(
  dashboardGovernanceSlot,
  defineWidget({
    order: 3,
    label: 'dashboard.unlockSchedule.title',
    render: UnlockScheduleWidget,
    defaultSize: { w: 2, h: 4 },
    minSize: { w: 1, h: 2 },
  }),
);

export const dashboardReferendumsFeature = createFeature({
  name: 'dashboard/referendums',
  input: createStore({}),
  enable: enableFlag,
});

dashboardReferendumsFeature.inject(
  dashboardGovernanceSlot,
  defineWidget({
    order: 0,
    label: 'dashboard.activeReferendums.title',
    render: ReferendumsWidget,
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 2, h: 3 },
  }),
);

export const dashboardGovernanceLocksFeature = createFeature({
  name: 'dashboard/governance-locks',
  input: createStore({}),
  enable: enableFlag,
});

dashboardGovernanceLocksFeature.inject(
  dashboardGovernanceSlot,
  defineWidget({
    order: 1,
    label: 'dashboard.governanceLocks.title',
    render: GovernanceLocksWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 2, h: 3 },
  }),
);
