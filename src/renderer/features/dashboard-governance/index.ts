import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardGovernanceSlot, defineWidget } from '@/pages/Dashboard';

import { GovernanceOverviewWidget } from './ui/GovernanceOverviewWidget';
import { LocksWidget } from './ui/LocksWidget';
import { ReferendumsWidget } from './ui/ReferendumsWidget';

const enableFlag = $features.map(({ dashboard }) => dashboard);
// Locks dispatches into `governance-unlock-flow`, which is mounted only
// when governance is on too — an Unlock button without its flow would click into nothing.
const locksEnableFlag = $features.map(({ dashboard, governance }) => dashboard && governance);

export const dashboardGovernanceFeature = createFeature({
  name: 'dashboard/governance',
  input: createStore({}),
  enable: enableFlag,
});

dashboardGovernanceFeature.inject(
  dashboardGovernanceSlot,
  defineWidget({
    order: 0,
    label: 'dashboard.governanceOverview.title',
    render: GovernanceOverviewWidget,
    defaultSize: { w: 2, h: 4 },
    minSize: { w: 1, h: 2 },
  }),
);

export const dashboardLocksFeature = createFeature({
  // Kept as the persisted layout key: renaming it would drop every user's saved position for this card.
  name: 'dashboard/unlock-schedule',
  input: createStore({}),
  enable: locksEnableFlag,
});

dashboardLocksFeature.inject(
  dashboardGovernanceSlot,
  defineWidget({
    order: 1,
    label: 'dashboard.locks.title',
    render: LocksWidget,
    defaultSize: { w: 2, h: 4 },
    minSize: { w: 2, h: 3 },
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
    order: 2,
    label: 'dashboard.activeReferendums.title',
    render: ReferendumsWidget,
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 2, h: 3 },
  }),
);
