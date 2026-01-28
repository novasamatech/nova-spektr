import { orderBy } from 'lodash';

import { walletModel, walletUtils } from '@/entities/wallet';

export const $multisigs = walletModel.$wallets.map(list => {
  const multisigs = list.filter(walletUtils.isAnyMultisig);
  return orderBy(multisigs, [walletUtils.isFlexibleMultisig], ['asc']);
});

export const walletsModel = {
  $multisigs,
};
