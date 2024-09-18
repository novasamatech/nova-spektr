import { sample } from 'effector';

import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { referendumsFeatureStatus } from './status';

const $list = fellowshipModel.$store.map(x => x?.tracks ?? []);

sample({
  clock: referendumsFeatureStatus.running,
  target: collectiveDomain.tracks.request,
});

export const tracksModel = {
  $list,
};
