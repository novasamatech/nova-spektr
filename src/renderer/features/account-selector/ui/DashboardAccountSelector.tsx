import { accountPresetsModel } from '@/aggregates/account-presets';

import { AccountSelectorSwitcher } from './AccountSelectorSwitcher';

export const DashboardAccountSelector = () => (
  <AccountSelectorSwitcher
    $activePresetId={accountPresetsModel.$activeDashboardPresetId}
    $quickFilters={accountPresetsModel.$dashboardQuickFilter}
    onQuickFiltersChange={accountPresetsModel.dashboardQuickFilterChanged}
    onActivate={accountPresetsModel.dashboardPresetActivated}
  />
);
