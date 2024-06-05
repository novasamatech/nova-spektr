import { createStore } from 'effector';

import type {
  TrackId,
  TrackInfo,
  ReferendumId,
  OngoingReferendum,
  CompletedReferendum,
  VotingThreshold, Voting,
} from '@shared/core';

const $ongoingReferendums = createStore<Map<ReferendumId, OngoingReferendum>>(new Map());
const $completedReferendums = createStore<Map<ReferendumId, CompletedReferendum>>(new Map());

const $tracks = createStore<Record<TrackId, TrackInfo>>({});
const $voting = createStore<Record<TrackId, Voting>>({});
const $approvalThresholds = createStore<Record<ReferendumId, VotingThreshold>>({});
const $supportThresholds = createStore<Record<ReferendumId, VotingThreshold>>({});

export const governanceModel = {
  $ongoingReferendums,
  $completedReferendums,
  $tracks,
  $voting,
  $approvalThresholds,
  $supportThresholds,
};
