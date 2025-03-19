import { sample } from 'effector';

import { track } from '@/domains/collectives';

import { fellowshipReferendumsDetailsFeature } from './feature';
import { fellowship } from './fellowship';

const $list = fellowship.$store.map(x => x?.tracks ?? []);

sample({
  clock: fellowshipReferendumsDetailsFeature.running,
  target: track.request,
});

export const tracksModel = {
  $list,
};
