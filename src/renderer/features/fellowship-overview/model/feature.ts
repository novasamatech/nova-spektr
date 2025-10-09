import { combine } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

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
});
