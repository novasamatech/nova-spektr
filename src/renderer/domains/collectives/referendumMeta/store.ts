import { createStore } from 'effector';

import { dictionary, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { deriveFromResources } from '@/shared/resource';
import { type CollectivesStruct } from '../_lib/types';

import { referendumMetaResource } from './resource';
import { type ReferendumMeta } from './types';

const $list = createStore<CollectivesStruct<Record<ReferendumId, ReferendumMeta>>>({});

deriveFromResources({
  store: $list,
  resources: [referendumMetaResource],
  map(state, referendums, metadata) {
    const { palletType, chainId } = metadata!.params;

    const previousState = pickNestedValue(state, palletType, chainId) ?? {};
    const resultMap = dictionary(referendums, 'referendumId');

    return setNestedValue(state, palletType, chainId, {
      ...previousState,
      ...resultMap,
    });

    // return mergeNested(state, referendums, r => r.referendumId);
  },
});

export const referendumMeta = {
  $list,
  request: referendumMetaResource.request,
};
