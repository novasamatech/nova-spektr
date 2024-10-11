import { sample } from 'effector';

import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { detailsFeatureStatus } from './status';

const $list = fellowshipModel.$store.map(x => x?.tracks ?? []);

sample({
  clock: detailsFeatureStatus.running,
  target: collectiveDomain.tracks.request,
});

export const tracksModel = {
  $list,
};
