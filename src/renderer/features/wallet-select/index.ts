import { walletSelectService } from '@/aggregates/wallet-select';

import { walletGroupSlot, walletIconSlot, walletSelectActionsSlot } from './components/WalletSelect';
import { GROUP_LABELS } from './constants';
import { walletSelectFeatureStatus } from './model/feature';

export { walletGroupSlot, walletIconSlot, walletSelectActionsSlot };

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
