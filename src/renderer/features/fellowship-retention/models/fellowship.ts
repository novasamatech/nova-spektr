import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { $collectiveStore } from '@/domains/collectives';

import { fellowshipRetentionFeature } from './feature';

const $fellowshipStore = $collectiveStore.map(store => store['fellowship'] || null);

const $store = combine($fellowshipStore, fellowshipRetentionFeature.state, (fellowshipStore, state) => {
  if (nullable(fellowshipStore) || state.status !== 'running') {
    return null;
  }

  return fellowshipStore[state.data.chainId] ?? null;
});

export const fellowship = {
  $store,
};
