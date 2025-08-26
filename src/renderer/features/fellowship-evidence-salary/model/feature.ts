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
    wallet: fellowshipMember.$currentMemberWallet,
    account: fellowshipMember.$currentMemberAccount,
    connected: fellowshipNetwork.$isConnected,
    wallets: walletModel.$wallets,
  },
  ({ network, ...rest }) => {
    if (nullable(network)) return null;

    return { ...network, ...rest };
  },
);

export const fellowshipEvidenceSalaryFeature = createFeature({
  name: 'fellowship/evidence-salary',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
  filter: input => {
    if (input.connected) return null;

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
  target: fellowshipEvidenceSalaryFeature.restore,
});
