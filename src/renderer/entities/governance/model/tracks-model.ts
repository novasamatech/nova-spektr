import { ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';

import { type Chain, type TrackId, type TrackInfo } from '@shared/core';
import { governanceService } from '@shared/api/governance';

type RequestTracksParams = {
  api: ApiPromise;
  chain: Chain;
};

const $tracks = createStore<Record<TrackId, TrackInfo>>({});

const requestTracks = createEvent<RequestTracksParams>();

const requestTracksFx = createEffect(({ api }: RequestTracksParams): Record<TrackId, TrackInfo> => {
  return governanceService.getTracks(api);
});

sample({
  clock: requestTracks,
  target: requestTracksFx,
});

sample({
  clock: requestTracksFx.doneData,
  target: $tracks,
});

$tracks.watch((x) => console.log('tracks', x));

export const tracksModel = {
  $tracks,
  $isTracksLoading: requestTracksFx.pending,

  effects: {
    requestTracksFx,
  },

  events: {
    requestTracks,
    requestDone: requestTracksFx.done,
  },
};
