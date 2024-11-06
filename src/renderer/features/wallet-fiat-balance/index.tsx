import { WalletFiatBalance } from './components/WalletFiatBalance';
import { walletsFiatBalanceFeatureStatus } from './model/feature';

export const walletsFiatBalanceFeature = {
  feature: walletsFiatBalanceFeatureStatus,
  views: {
    WalletFiatBalance,
  },
};
