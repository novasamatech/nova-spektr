import { walletModel, walletUtils } from '@/entities/wallet';

export const $multisigs = walletModel.$wallets.map(list => list.filter(walletUtils.isMultisig));

export const walletsModel = {
  $multisigs,
};
