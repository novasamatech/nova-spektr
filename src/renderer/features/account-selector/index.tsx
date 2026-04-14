import { createFeature } from '@/shared/feature';
import { dashboardPresetSwitcherSlot } from '@/pages/Dashboard';
import { operationsPresetSwitcherSlot } from '@/pages/Operations';

import { DashboardAccountSelector } from './ui/DashboardAccountSelector';
import { OperationsAccountSelector } from './ui/OperationsAccountSelector';

// Two separate feature instances because the DI system keys slot registrations by feature name —
// calling inject twice on the same feature would clobber the first registration.
const dashboardAccountSelectorFeature = createFeature({ name: 'account-selector/dashboard' });
dashboardAccountSelectorFeature.inject(dashboardPresetSwitcherSlot, { render: DashboardAccountSelector });

const operationsAccountSelectorFeature = createFeature({ name: 'account-selector/operations' });
operationsAccountSelectorFeature.inject(operationsPresetSwitcherSlot, { render: OperationsAccountSelector });

export { dashboardAccountSelectorFeature, operationsAccountSelectorFeature };
