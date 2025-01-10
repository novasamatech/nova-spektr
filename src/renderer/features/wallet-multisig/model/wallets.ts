import { walletModel, walletUtils } from '@/entities/wallet';

export const $regularMultisig = walletModel.$wallets.map(list => list.filter(walletUtils.isRegularMultisig));
export const $flexibleMutisig = walletModel.$wallets.map(list => list.filter(walletUtils.isFlexibleMultisig));

export const walletsModel = {
  $regularMultisig,
  $flexibleMutisig,
};
