import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';

const $fellowshipStore = collectiveDomain.$store.map(store => store['fellowship'] || null);

const $store = combine(
  $fellowshipStore,
  fellowshipNetworkFeature.model.network.$network,
  (fellowshipStore, network) => {
    if (nullable(fellowshipStore) || nullable(network)) return null;

    return fellowshipStore[network.chain.chainId];
  },
);

export const fellowshipModel = {
  $store,
};
