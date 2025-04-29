import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { walletModel } from '@/entities/wallet';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { ERROR } from '../constants';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    member: fellowshipMember.$currentMember,
    account: fellowshipMember.$currentMemberAccount,
    wallet: fellowshipMember.$currentMemberWallet,
    connected: fellowshipNetwork.$isConnected,
    wallets: walletModel.$wallets,
  },
  ({ network, ...rest }) => {
    if (nullable(network)) return null;

    return { ...network, ...rest };
  },
);

export const fellowshipProfileFeature = createFeature({
  name: 'fellowship/profile',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
  filter: input => {
    if (input.connected) return null;

    return {
      status: 'failed',
      type: 'warning',
      error: new Error(ERROR.NETWORK_DISABLED),
    };
  },
});

sample({
  clock: fellowshipNetwork.$isConnected,
  filter: fellowshipNetwork.$isConnected,
  target: fellowshipProfileFeature.restore,
});
