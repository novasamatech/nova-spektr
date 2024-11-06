import { walletDetailsModel } from './model/wallet-details-model';
import { WalletDetails } from './ui/components/WalletDetails';

export const walletDetailsFeature = {
  views: {
    WalletDetails,
  },
  models: {
    walletDetails: walletDetailsModel,
  },
};
