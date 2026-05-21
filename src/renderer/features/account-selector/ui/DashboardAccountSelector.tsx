import { accountPresetsModel } from '@/aggregates/account-presets';

import { AccountSelectorSwitcher } from './AccountSelectorSwitcher';

export const DashboardAccountSelector = () => (
  <AccountSelectorSwitcher
    $activePresetId={accountPresetsModel.$activeDashboardPresetId}
    onActivate={accountPresetsModel.dashboardPresetActivated}
  />
);
