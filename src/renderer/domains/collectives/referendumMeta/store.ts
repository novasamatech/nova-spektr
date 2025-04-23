import { createStore } from 'effector';

import { deriveFromResources } from '@/shared/resource';
import { mergeNested } from '../_lib/helpers';
import { type CollectivesStruct } from '../_lib/types';

import { referendumMetaResource } from './resource';
import { type ReferendumMeta } from './types';

const $list = createStore<CollectivesStruct<ReferendumMeta[]>>({});

deriveFromResources({
  store: $list,
  resources: [referendumMetaResource],
  map(state, referendums) {
    return mergeNested(state, referendums, r => r.referendumId);
  },
});

export const referendumMeta = {
  $list,
  request: referendumMetaResource.request,
};
