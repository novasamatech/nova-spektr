import { walletModel } from '@/entities/wallet';
import { polkadotExtensionService } from '../service';

const $list = walletModel.$wallets.map((wallets) => wallets.filter(polkadotExtensionService.isPolkadotExtensionWallet));

export const wallets = {
  $list,
};
