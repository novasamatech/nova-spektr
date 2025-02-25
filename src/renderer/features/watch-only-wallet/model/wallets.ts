import { walletModel, walletUtils } from '@/entities/wallet';

export const $wallets = walletModel.$wallets.map(list => list.filter(walletUtils.isWatchOnly));

export const walletsModel = {
  $wallets,
};
