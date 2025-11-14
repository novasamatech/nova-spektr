import { createStore } from 'effector';
import { readonly } from 'patronum';

import { populated } from '@/shared/effector';
import { deriveFromResources } from '@/shared/resource';
import { mergeNested } from '../_lib/helpers';
import { type CollectivesStruct } from '../_lib/types';

import { fetchResource, referendumsWithEvidenceResource, subscriptionResource } from './resource';
import { type Referendum, type ReferendumWithEvidence } from './types';

const $list = createStore<CollectivesStruct<Referendum[]>>({});

deriveFromResources({
  store: $list,
  resources: [fetchResource, subscriptionResource],
  map(state, referendums) {
    return mergeNested(state, referendums, r => r.id);
  },
});

const $referendumsWithEvidence = createStore<CollectivesStruct<ReferendumWithEvidence[]>>({});

deriveFromResources({
  store: $referendumsWithEvidence,
  resources: [referendumsWithEvidenceResource],
  map(state, referendums) {
    return mergeNested(state, referendums, r => r.index);
  },
});

const $referendumsWithEvidencePopulated = populated(referendumsWithEvidenceResource.request);

export const referendum = {
  $list: readonly($list),
  $referendumsWithEvidence: readonly($referendumsWithEvidence),
  $referendumsWithEvidencePopulated: readonly($referendumsWithEvidencePopulated),
  request: fetchResource.request,
  subscribe: subscriptionResource.subscribe,
  unsubscribe: subscriptionResource.unsubscribe,
  fulfilled: subscriptionResource.fulfilled,
  requestReferendumsWithEvidence: referendumsWithEvidenceResource.request,
};
