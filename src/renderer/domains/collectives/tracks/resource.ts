import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';
import { produce } from 'immer';

import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { type ReferendaCurve, referendaPallet } from '@/shared/pallet/referenda';
import { createQueryResource } from '@/shared/query';
import { mergeNested } from '../_lib/service';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type Track, type VotingCurve } from './types';

const mapCurve = (value: ReferendaCurve): VotingCurve => {
  switch (value.type) {
    case 'LinearDecreasing':
      return {
        type: 'LinearDecreasing',
        length: value.data.length,
        floor: value.data.floor,
        ceil: value.data.ceil,
      };
    case 'SteppedDecreasing':
      return {
        type: 'SteppedDecreasing',
        begin: value.data.begin,
        end: value.data.end,
        period: value.data.period,
        step: value.data.step,
      };
    case 'Reciprocal':
      return {
        type: 'Reciprocal',
        factor: value.data.factor,
        xOffset: value.data.xOffset,
        yOffset: value.data.yOffset,
      };
  }
};

export type RequestTracksParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
};

export const tracksResource = createQueryResource<RequestTracksParams>({
  key: ({ palletType, api }) => [palletType, api.genesisHash.toHex()],
})
  .request<Track[]>(async ({ api, palletType }) => {
    const chainId = api.genesisHash.toHex();
    const tracks = referendaPallet.consts.tracks(palletType, api);

    return tracks.map(({ id, info }) => {
      const minApproval = mapCurve(info.minApproval);
      const minSupport = mapCurve(info.minSupport);

      return {
        id,
        name: info.name,
        chainId,
        pallet: palletType,
        maxDeciding: info.maxDeciding,
        decisionDeposit: info.decisionDeposit,
        preparePeriod: info.preparePeriod,
        decisionPeriod: info.decisionPeriod,
        minEnactmentPeriod: info.minEnactmentPeriod,
        minApproval,
        minSupport,
      };
    });
  })
  .cache<CollectivesStruct<Track[]>>({
    staleAfter: Number.POSITIVE_INFINITY,
    store: createStore({}),
    map(state, tracks) {
      return mergeNested(state, tracks, t => t.id);
    },
  })
  .build();

export type RequestMaxRankParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
};

export const maxRankResource = createQueryResource<RequestMaxRankParams>({
  key: ({ palletType, api }) => [palletType, api.genesisHash.toHex()],
})
  .request(({ palletType, api }) => collectiveCorePallet.consts.maxRank(palletType, api))
  .cache<CollectivesStruct<number>>({
    staleAfter: Number.POSITIVE_INFINITY,
    store: createStore({}),
    map(state, maxRank, { palletType, api }) {
      return produce(state, draft => {
        let pallet = draft[palletType];
        if (!pallet) {
          pallet = {};
          draft[palletType] = pallet;
        }
        pallet[api.genesisHash.toHex()] = maxRank;
      });
    },
  })
  .build();
