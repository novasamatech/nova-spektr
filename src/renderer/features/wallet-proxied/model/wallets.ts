import { walletModel, walletUtils } from '@/entities/wallet';

const $wallets = walletModel.$wallets.map(list => list.filter(walletUtils.isProxied));

export const walletsModel = {
  $wallets,
};
