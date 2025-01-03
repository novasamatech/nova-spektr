import { WalletFiatBalance } from './components/WalletFiatBalance';
import { walletFiatBalanceFeatureStatus } from './model/feature';

export const walletsFiatBalanceFeature = {
  feature: walletFiatBalanceFeatureStatus,
  views: {
    WalletFiatBalance,
  },
};
