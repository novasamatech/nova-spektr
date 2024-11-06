import { GROUP_LABELS, WalletGroup } from './components/WalletGroup';
import { walletsSelectFeatureStatus } from './model/feature';
import { walletSelectModel } from './model/wallet-select-model';
import { walletSelectService } from './service/walletSelectService';

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
