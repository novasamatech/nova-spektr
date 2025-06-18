import { createStore } from 'effector';

import { pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { deriveFromResources } from '@/shared/resource';
import { type CollectivesStruct } from '../_lib/types';

import { rfcSummaryResource } from './resource';
import { type RfcDetails } from './types';

const $list = createStore<CollectivesStruct<Record<string, RfcDetails>>>({});

deriveFromResources({
  store: $list,
  resources: [rfcSummaryResource],
  map(state, rfcDetail, params) {
    const { palletType, chainId } = params;
    const previousState = pickNestedValue(state, palletType, chainId) ?? {};

    return setNestedValue(state, palletType, chainId, {
      ...previousState,
      [rfcDetail.prNumber]: rfcDetail,
    });
  },
});

export const rfcDetails = {
  $list,

  request: rfcSummaryResource.request,
};
