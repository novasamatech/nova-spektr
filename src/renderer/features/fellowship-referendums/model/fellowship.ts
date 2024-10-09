import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';

import { referendumsFeatureStatus } from './status';

const $fellowshipStore = collectiveDomain.$store.map(store => store['fellowship'] || null);

const $store = combine($fellowshipStore, referendumsFeatureStatus.state, (fellowshipStore, state) => {
  if (nullable(fellowshipStore) || (state.status !== 'running' && state.status !== 'failed')) {
    return null;
  }

  if (nullable(state.data)) return null;

  return fellowshipStore[state.data.chainId] ?? null;
});

export const fellowshipModel = {
  $store,
};
