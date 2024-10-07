import { type ApiPromise } from '@polkadot/api';
import { createEvent, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { ambassadorCorePallet } from '@/shared/pallet/ambassadorCore';
import { fellowshipCorePallet } from '@/shared/pallet/fellowshipCore';
import { referendaPallet } from '@/shared/pallet/referenda';
import { type CollectivePalletsType, type CollectivesStruct } from '../../lib/types';

import { mapCurve } from './mapper';
import { type Track } from './types';

type RequestTracksParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
};

const request = createEvent<RequestTracksParams>();

const {
  $: $list,
  fulfilled,
  pending,
  request: requestTracks,
} = createDataSource<CollectivesStruct<Track[]>, RequestTracksParams, Track[]>({
  initial: {},
  filter: ({ chainId, palletType }, store) => {
    const value = pickNestedValue(store, palletType, chainId);

    return nullable(value) || value.length === 0;
  },
  fn: ({ api, palletType }) => {
    const tracks = referendaPallet.consts.tracks(palletType, api);

    return tracks.map(({ track, info }) => {
      const minApproval = mapCurve(info.minApproval);
      const minSupport = mapCurve(info.minSupport);

      return {
        id: track,
        name: info.name,
        maxDeciding: info.maxDeciding,
        decisionDeposit: info.decisionDeposit,
        preparePeriod: info.preparePeriod,
        decisionPeriod: info.decisionPeriod,
        minApproval,
        minSupport,
      };
    });
  },
  map: (store, { params, result }) => {
    return setNestedValue(store, params.palletType, params.chainId, result);
  },
});

const { $: $maxRank, request: requestMaxRank } = createDataSource<
  CollectivesStruct<number>,
  RequestTracksParams,
  number
>({
  initial: {},
  fn: ({ api, palletType }) => {
    return palletType === 'fellowship'
      ? fellowshipCorePallet.consts.maxRank(api)
      : ambassadorCorePallet.consts.maxRank(api);
  },
  map: (store, { params, result }) => {
    return setNestedValue(store, params.palletType, params.chainId, result);
  },
});

sample({
  clock: request,
  target: [requestTracks, requestMaxRank],
});

export const tracksDomainModel = {
  $list,
  $maxRank,
  fulfilled,
  pending,
  request,
};
