import { combine } from 'effector';
import { or } from 'patronum';

import { walletModel } from '@/entities/wallet';
import { membersModel } from '../../members/model/members';
import { fellowshipNetworkModel } from '../../network/model/fellowshipNetwork';
import { profileUtils } from '../lib/utils';

const $fellowshipAccount = combine(
  { wallet: walletModel.$activeWallet, members: membersModel.$members, network: fellowshipNetworkModel.$network },
  ({ wallet, members, network }) => {
    if (!wallet || !members || !network) return null;

    return profileUtils.findMachingAccount(wallet, members, network.chain);
  },
);

export const profileModel = {
  $fellowshipAccount,
  $isLoading: or(membersModel.$isLoading, fellowshipNetworkModel.$isConnecting),
};
