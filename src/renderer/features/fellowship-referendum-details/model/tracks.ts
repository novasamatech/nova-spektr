import { sample } from 'effector';

import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { referendumsDetailsFeatureStatus } from './status';

const $list = fellowshipModel.$store.map(x => x?.tracks ?? []);

sample({
  clock: referendumsDetailsFeatureStatus.running,
  target: collectiveDomain.tracks.request,
});

export const tracksModel = {
  $list,
};
