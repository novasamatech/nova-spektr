import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardGovernanceSlot } from '@/pages/Dashboard';

import { ActiveReferendumsWidget } from './ui/ActiveReferendumsWidget';
import { GovernanceOverviewWidget } from './ui/GovernanceOverviewWidget';

const enableFlag = $features.map(({ dashboard }) => dashboard);

export const dashboardGovernanceFeature = createFeature({
  name: 'dashboard/governance',
  input: createStore({}),
  enable: enableFlag,
});

dashboardGovernanceFeature.inject(dashboardGovernanceSlot, {
  order: 0,
  render: GovernanceOverviewWidget,
});

export const dashboardReferendumsFeature = createFeature({
  name: 'dashboard/referendums',
  input: createStore({}),
  enable: enableFlag,
});

dashboardReferendumsFeature.inject(dashboardGovernanceSlot, {
  order: 1,
  render: ActiveReferendumsWidget,
});
