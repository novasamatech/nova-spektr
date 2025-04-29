import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { registry, registryService } from '@/domains/network';
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
    connection: registry.$connectionStatuses,
    wallets: walletModel.$wallets,
  },
  ({ network, member, account, wallet, wallets, connection }) => {
    if (nullable(network) || nullable(connection[network.chainId])) return null;

    return {
      ...network,
      status: connection[network.chainId],
      member,
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
  filter: input => {
    if (input.api.isConnected && registryService.isConnected(input.status)) return null;

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
