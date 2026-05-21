import { walletSelectService } from '@/aggregates/wallet-select';

import { walletGroupSlot, walletIconSlot, walletSelectActionsSlot } from './components/WalletSelect';
import { GROUP_LABELS } from './constants';
import { walletSelectFeatureStatus } from './model/feature';
import { walletSelectUI } from './model/ui-state';

export { walletGroupSlot, walletIconSlot, walletSelectActionsSlot, walletSelectUI };

// TODO remove this mess
export const walletSelectFeature = {
  feature: walletSelectFeatureStatus,
  services: {
    walletSelect: walletSelectService,
  },
  constants: {
    GROUP_LABELS,
  },
};
