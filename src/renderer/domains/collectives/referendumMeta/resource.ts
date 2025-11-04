import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { polkassemblyApiService } from '@/shared/api/polkassembly';
import { subsquareApiService } from '@/shared/api/subsquare';
import { type ChainId } from '@/shared/core';
import { dictionary, getBlockFromTime, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { createQueryResource } from '@/shared/query';
import { POLKADOT_COLLECTIVES_CHAIN } from '../_lib/constants';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type ReferendumMeta, type ReferendumMetaProvider } from './types';

type ReferendumMetaWithContext = ReferendumMeta & {
  pallet: CollectivePalletsType;
  chainId: ChainId;
};

export type ReferendumMetaRequestParams = {
  provider: ReferendumMetaProvider;
  api: ApiPromise;
  palletType: CollectivePalletsType;
};

export const referendumMetaResource = createQueryResource<ReferendumMetaRequestParams>({
  key: ({ palletType, api }) => [palletType, api.genesisHash.toHex()],
})
  .request<ReferendumMetaWithContext[]>(async ({ api, provider, palletType }) => {
    const chainId = api.genesisHash.toHex();
    let response: ReferendumMeta[] = [];
    // external providers work only with polkadot collectives chain
    if (chainId !== POLKADOT_COLLECTIVES_CHAIN) {
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
            blockHash: x.indexer.blockHash,
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

    return response.map(r => ({
      ...r,
      pallet: palletType,
      chainId,
    }));
  })
  .cache<CollectivesStruct<Record<ReferendumId, ReferendumMetaWithContext>>>({
    store: createStore({}),
    map(state, referendums, { palletType, api }) {
      const chainId = api.genesisHash.toHex();

      const previousState = pickNestedValue(state, palletType, chainId) ?? {};
      const resultMap = dictionary(referendums, 'referendumId');

      return setNestedValue(state, palletType, chainId, {
        ...previousState,
        ...resultMap,
      });
    },
  })
  .build();
