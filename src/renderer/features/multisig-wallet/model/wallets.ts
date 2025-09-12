import { orderBy } from 'lodash';

import { walletModel, walletUtils } from '@/entities/wallet';

export const $multisigs = walletModel.$wallets.map(list => {
  const multisigs = list.filter(walletUtils.isMultisig);
  return orderBy(multisigs, [walletUtils.isFlexibleMultisig], ['desc']);
});

export const walletsModel = {
  $multisigs,
};
