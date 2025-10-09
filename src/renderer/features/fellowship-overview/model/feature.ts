import { combine, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { ERROR } from './constants';

const $input = combine(
  {
    network: fellowshipNetwork.$network,
  },
  ({ network }) => {
    if (nullable(network)) return null;

    return {
      api: network.api,
      asset: network.asset,
      chain: network.chain,
      chainId: network.chainId,
      palletType: network.palletType,
    };
  },
);

export const fellowshipOverviewFeature = createFeature({
  name: 'fellowship/overview',
  enable: $features.map(({ fellowship }) => fellowship),
  input: $input,
  filter: input => {
    return input.api.isConnected
      ? null
      : {
          status: 'failed',
          type: 'warning',
          error: new Error(ERROR.NETWORK_DISABLED),
        };
  },
});

sample({
  clock: fellowshipNetwork.$isConnected,
  filter: fellowshipNetwork.$isConnected,
  target: fellowshipOverviewFeature.restore,
});
