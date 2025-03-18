import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { $collectiveStore } from '@/domains/collectives';

import { fellowshipReferendumsFeature } from './feature';

const $fellowshipStore = $collectiveStore.map(store => store['fellowship'] || null);

const $store = combine($fellowshipStore, fellowshipReferendumsFeature.state, (fellowshipStore, state) => {
  if (nullable(fellowshipStore) || (state.status !== 'running' && state.status !== 'failed')) {
    return null;
  }

  if (nullable(state.data)) return null;

  return fellowshipStore[state.data.chainId] ?? null;
});

export const fellowshipModel = {
  $store,
};
