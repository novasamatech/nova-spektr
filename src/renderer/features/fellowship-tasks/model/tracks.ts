import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';

import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';

// tracks

const $tracks = fellowship.$store.map(store => store?.tracks ?? []);

const $currentTrack = combine(memberProfile.$member, $tracks, (member, tracks) => {
  if (nullable(member)) return null;
  return tracks.find(t => t.id === member.rank) ?? null;
});

const $nextTrack = combine(memberProfile.$member, $tracks, (member, tracks) => {
  if (nullable(member)) return null;
  const index = tracks.findIndex(t => t.id === member.rank);
  return tracks.at(index + 1) ?? null;
});

export const tracks = {
  $tracks,
  $currentTrack,
  $nextTrack,
};
