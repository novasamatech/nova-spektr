import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { walletModel } from '@/entities/wallet';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    account: fellowshipMember.$currentMemberAccount,
    wallet: fellowshipMember.$currentMemberWallet,
    wallets: walletModel.$wallets,
  },
  ({ network, account, wallet, wallets }) => {
    if (nullable(network)) return null;

    return {
      api: network.api,
      chain: network.chain,
      account,
      wallet,
      wallets,
    };
  },
);

export const fellowshipProfileFeature = createFeature({
  name: 'fellowship/profile',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
});

sample({
  clock: fellowshipNetwork.$isConnected,
  filter: fellowshipNetwork.$isConnected,
  target: fellowshipProfileFeature.restore,
});
