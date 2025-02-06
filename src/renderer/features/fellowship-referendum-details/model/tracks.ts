import { sample } from 'effector';

import { collectiveDomain } from '@/domains/collectives';

import { referendumsDetailsFeature } from './feature';
import { fellowshipModel } from './fellowship';

const $list = fellowshipModel.$store.map(x => x?.tracks ?? []);

sample({
  clock: referendumsDetailsFeature.running,
  target: collectiveDomain.tracks.request,
});

export const tracksModel = {
  $list,
};
