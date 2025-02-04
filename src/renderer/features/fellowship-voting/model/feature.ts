import { combine } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { walletModel } from '@/entities/wallet';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
    member: fellowshipMember.$currentMember,
    account: fellowshipMember.$currentMemberAccount,
    wallets: walletModel.$wallets,
  },
  ({ network, wallets, account, member }) => {
    if (nullable(network)) return null;

    return {
      api: network.api,
      asset: network.asset,
      chain: network.chain,
      chainId: network.chainId,
      palletType: network.palletType,
      member,
      account,
      wallets,
    };
  },
);

export const votingFeatureStatus = createFeature({
  name: 'fellowship/voting',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
});
