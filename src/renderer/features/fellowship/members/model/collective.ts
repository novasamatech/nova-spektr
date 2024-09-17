import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';
import { fellowshipNetworkModel } from '@/features/fellowship/network';

const $fellowshipStore = collectiveDomain.$store.map(store => store['fellowship'] || null);

const $store = combine($fellowshipStore, fellowshipNetworkModel.$network, (fellowshipStore, network) => {
  if (nullable(fellowshipStore) || nullable(network)) return null;

  return fellowshipStore[network.chain.chainId];
});

export const collectiveModel = {
  $store,
};
