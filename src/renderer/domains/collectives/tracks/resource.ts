import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { type ReferendaCurve, referendaPallet } from '@/shared/pallet/referenda';
import { createRemoteResource } from '@/shared/resource';
import { type CollectivePalletsType } from '../_lib/types';

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

type RequestTracksParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
};

export const tracksResource = createRemoteResource<RequestTracksParams, Track[]>({
  once: true,
  pool: ({ palletType, chainId }) => `${palletType}:${chainId}`,
  fn({ api, palletType, chainId }) {
    const tracks = referendaPallet.consts.tracks(palletType, api);

    return tracks.map<Track>(({ track, info }) => {
      const minApproval = mapCurve(info.minApproval);
      const minSupport = mapCurve(info.minSupport);

      return {
        id: track,
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
  },
});

type RequestMaxRankParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
};

type MaxRankResponse = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
  maxRank: number;
};

export const maxRankResource = createRemoteResource<RequestMaxRankParams, MaxRankResponse>({
  once: true,
  pool: ({ palletType, chainId }) => `${palletType}:${chainId}`,
  fn({ api, palletType, chainId }) {
    return {
      palletType,
      chainId,
      maxRank: collectiveCorePallet.consts.maxRank(palletType, api),
    };
  },
});
