import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createDataSource } from '@shared/effector';
import { merge, pickNestedValue, setNestedValue } from '@shared/lib/utils';
import { referendaPallet } from '@shared/pallet/referenda';
import { type CollectivePalletsType, type Store } from '../../lib/types';

import { mapCurve } from './mapper';
import { type Track } from './types';

type RequestTracksParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
};

const {
  $: $list,
  fulfilled,
  pending,
  request,
} = createDataSource<Store<Track[]>, RequestTracksParams, Track[]>({
  initial: {},
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
    const currentStore = pickNestedValue(store, params.palletType, params.chainId) ?? [];
    const updatedField = merge(
      currentStore,
      result,
      x => x.id,
      (a, b) => a.id - b.id,
    );

    return setNestedValue(store, params.palletType, params.chainId, updatedField);
  },
});

export const tracksDomainModel = {
  $list,
  fulfilled,
  pending,
  request,
};
