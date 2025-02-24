import { walletModel, walletUtils } from '@/entities/wallet';

export const $regularMultisig = walletModel.$wallets.map(list => list.filter(walletUtils.isRegularMultisig));
export const $flexibleMultisig = walletModel.$wallets.map(list => list.filter(walletUtils.isFlexibleMultisig));

export const walletsModel = {
  $regularMultisig,
  $flexibleMultisig,
};
