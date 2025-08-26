import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { $collectiveStore } from '@/domains/collectives';

import { fellowshipVotingHistoryFeature } from './feature';

const $fellowshipStore = $collectiveStore.map(store => store['fellowship'] || null);

const $store = combine($fellowshipStore, fellowshipVotingHistoryFeature.state, (fellowshipStore, state) => {
  if (nullable(fellowshipStore) || state.status !== 'running') {
    return null;
  }

  return fellowshipStore[state.data.chainId] ?? null;
});

const $referendumMeta = $store.map(store => store?.referendumMeta ?? {});

export const fellowshipModel = {
  $store,
  $referendumMeta,
};
