import { walletModel, walletUtils } from '@/entities/wallet';

export const $walletConnectWallets = walletModel.$wallets.map(list => list.filter(walletUtils.isWalletConnect));
export const $novaWallets = walletModel.$wallets.map(list => list.filter(walletUtils.isNovaWallet));

export const walletsModel = {
  $walletConnectWallets,
  $novaWallets,
};
