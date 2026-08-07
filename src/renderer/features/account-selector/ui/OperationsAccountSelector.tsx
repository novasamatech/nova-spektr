import { accountPresetsModel } from '@/aggregates/account-presets';

import { AccountSelectorSwitcher } from './AccountSelectorSwitcher';

export const OperationsAccountSelector = () => (
  <AccountSelectorSwitcher
    $activePresetId={accountPresetsModel.$activeOperationsPresetId}
    $quickFilters={accountPresetsModel.$operationsQuickFilter}
    onQuickFiltersChange={accountPresetsModel.operationsQuickFilterChanged}
    onActivate={accountPresetsModel.operationsPresetActivated}
  />
);
