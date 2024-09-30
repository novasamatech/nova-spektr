import { type ReferendumId } from '@/shared/pallet/referenda';
import { subsquareApiService } from '@shared/api/subsquare';
import { type ChainId } from '@shared/core';
import { createDataSource } from '@shared/effector';
import { dictionary, pickNestedValue, setNestedValue } from '@shared/lib/utils';
import { type CollectivePalletsType, type CollectivesStruct } from '../../lib/types';

import { type ReferendumMeta } from './types';

type RequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

const {
  $: $list,
  request,
  pending,
  fulfilled,
} = createDataSource<CollectivesStruct<Record<ReferendumId, ReferendumMeta>>, RequestParams, ReferendumMeta[]>({
  initial: {},
  fn: async () => {
    let response: ReferendumMeta[] = [];

    // TODO implement
    const pages = subsquareApiService.fetchReferendumList({
      network: 'collectives',
      referendumType: 'fellowship',
    });

    for await (const page of pages) {
      response = response.concat(
        page.map(x => ({
          referendumId: x.referendumIndex,
          title: x.title,
          description: x.content,
        })),
      );
    }

    return response;
  },
  map: (store, { params, result }) => {
    const currectValue = pickNestedValue(store, params.palletType, params.chainId);
    const resultMap = dictionary(result, 'referendumId');

    return setNestedValue(store, params.palletType, params.chainId, {
      ...(currectValue ?? {}),
      ...resultMap,
    });
  },
});

export const referendumMetaModel = {
  $list,
  request,
  pending,
  fulfilled,
};
