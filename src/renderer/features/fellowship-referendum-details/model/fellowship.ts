import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';

import { referendumsDetailsFeature } from './feature';

const $fellowshipStore = collectiveDomain.$store.map(store => store['fellowship'] || null);

const $store = combine($fellowshipStore, referendumsDetailsFeature.state, (fellowshipStore, state) => {
  if (nullable(fellowshipStore) || state.status !== 'running') {
    return null;
  }

  return fellowshipStore[state.data.chainId] ?? null;
});

export const fellowshipModel = {
  $store,
};
