import { type ApiPromise } from '@polkadot/api';

import { polkassemblyApiService } from '@/shared/api/polkassembly';
import { subsquareApiService } from '@/shared/api/subsquare';
import { type ChainId } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { dictionary, getBlockFromTime, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type ReferendumMeta, type ReferendumMetaProvider } from './types';

type RequestParams = {
  provider: ReferendumMetaProvider;
  api: ApiPromise;
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
  fn: async ({ chainId, api, provider }) => {
    let response: ReferendumMeta[] = [];
    // external providers work only with polkadot collectives chain
    if (chainId !== '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2') {
      return [];
    }

    if (provider === 'subsquare') {
      // TODO support ambassadors
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
            track: x.track,
            status: x.state.name,
            created: x.indexer.blockHeight,
          })),
        );
      }
    }

    if (provider === 'polkassembly') {
      // TODO support ambassadors
      const pages = polkassemblyApiService.fetchFellowshipReferendumsList({
        network: 'collectives',
      });

      for await (const page of pages) {
        const mappedResponses = await Promise.all(
          page.map(async x => {
            const timestamp = new Date(x.created_at).getTime();
            const blockHeight = await getBlockFromTime(timestamp, api);

            return {
              referendumId: x.id,
              title: x.title,
              description: x.content ?? '',
              track: x.trackNumber,
              status: x.status,
              created: blockHeight,
            };
          }),
        );

        response = response.concat(mappedResponses);
      }
    }
    return response;
  },
  map: (store, { params, result }) => {
    const currentValue = pickNestedValue(store, params.palletType, params.chainId);
    const resultMap = dictionary(result, 'referendumId');

    return setNestedValue(store, params.palletType, params.chainId, {
      ...(currentValue ?? {}),
      ...resultMap,
    });
  },
});

export const referendumMeta = {
  $list,
  request,
  pending,
  fulfilled,
};
