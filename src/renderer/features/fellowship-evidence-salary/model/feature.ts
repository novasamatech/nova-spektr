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
    wallet: fellowshipMember.$currentMemberWallet,
    account: fellowshipMember.$currentMemberAccount,
    connection: registry.$connectionStatuses,
    wallets: walletModel.$wallets,
  },
  ({ network, wallets, wallet, account, member, connection }) => {
    if (nullable(network) || nullable(connection[network.chainId])) return null;

    return {
      ...network,
      status: connection[network.chainId],
      member,
      wallet,
      account,
      wallets,
    };
  },
);

export const fellowshipSalaryFeature = createFeature({
  name: 'fellowship/salary',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
  filter: input => {
    if (input.api.isConnected && registryService.isConnected(input.status)) return null;

    return {
      status: 'failed',
      type: 'warning',
      error: new Error(ERROR.networkDisabled),
    };
  },
});

sample({
  clock: fellowshipNetwork.$isConnected,
  filter: fellowshipNetwork.$isConnected,
  target: fellowshipSalaryFeature.restore,
});
