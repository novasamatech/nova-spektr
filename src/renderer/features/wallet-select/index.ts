import { GROUP_LABELS, WalletGroup } from './components/WalletGroup';
import { walletGroupSlot, walletSelectActionsSlot } from './components/WalletSelect';
import { walletsSelectFeatureStatus } from './model/feature';
import { walletSelectModel } from './model/wallet-select-model';
import { walletSelectService } from './service/walletSelectService';

export { walletSelectActionsSlot, walletGroupSlot };

// TODO remove this mess
export const walletSelectFeature = {
  feature: walletsSelectFeatureStatus,
  services: {
    walletSelect: walletSelectService,
  },
  selectModel: walletSelectModel,
  constants: {
    GROUP_LABELS,
  },
  views: {
    WalletGroup,
  },
};
