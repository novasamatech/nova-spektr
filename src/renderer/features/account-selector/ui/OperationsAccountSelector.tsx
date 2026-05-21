import { accountPresetsModel } from '@/aggregates/account-presets';

import { AccountSelectorSwitcher } from './AccountSelectorSwitcher';

export const OperationsAccountSelector = () => (
  <AccountSelectorSwitcher
    $activePresetId={accountPresetsModel.$activeOperationsPresetId}
    onActivate={accountPresetsModel.operationsPresetActivated}
  />
);
