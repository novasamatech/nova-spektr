import { createStore, createEvent, sample, createEffect } from 'effector';

import { IGovernanceApi } from '@shared/api/governance';
import type { SourceType } from '../lib/types';
import { localStorageService } from '@shared/api/local-storage';
import { GOVERNANCE_API_KEY, GovernanceApis } from '../lib/constants';
import type {
  TrackId,
  TrackInfo,
  ReferendumId,
  OngoingReferendum,
  CompletedReferendum,
  VotingThreshold,
  VotingMap,
} from '@shared/core';

const governanceStarted = createEvent();
const governanceApiChanged = createEvent<SourceType>();

const $ongoingReferendums = createStore<Map<ReferendumId, OngoingReferendum>>(new Map());
const $completedReferendums = createStore<Map<ReferendumId, CompletedReferendum>>(new Map());

const $tracks = createStore<Record<TrackId, TrackInfo>>({});
const $voting = createStore<VotingMap>({}); // address -> track -> voting
const $approvalThresholds = createStore<Record<ReferendumId, VotingThreshold>>({});
const $supportThresholds = createStore<Record<ReferendumId, VotingThreshold>>({});

const $governanceApi = createStore<{ type: SourceType; service: IGovernanceApi } | null>(null);

const getGovernanceApiFx = createEffect((): SourceType => {
  return localStorageService.getFromStorage(GOVERNANCE_API_KEY, 'polkassembly');
});

const saveGovernanceApiFx = createEffect((sourceType: SourceType): SourceType => {
  return localStorageService.saveToStorage(GOVERNANCE_API_KEY, sourceType);
});

sample({
  clock: governanceStarted,
  target: getGovernanceApiFx,
});

sample({
  clock: governanceApiChanged,
  target: saveGovernanceApiFx,
});

sample({
  clock: [getGovernanceApiFx.doneData, saveGovernanceApiFx.doneData],
  fn: (sourceType) => ({
    type: sourceType,
    service: GovernanceApis[sourceType],
  }),
  target: $governanceApi,
});

export const governanceModel = {
  $ongoingReferendums,
  $completedReferendums,
  $tracks,
  $voting,
  $approvalThresholds,
  $supportThresholds,
  $governanceApi,

  events: {
    governanceStarted,
    governanceApiChanged,
  },
};
