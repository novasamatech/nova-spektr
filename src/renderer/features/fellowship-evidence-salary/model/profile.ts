import { sample } from 'effector';

import { track } from '@/domains/collectives';

import { fellowshipEvidenceSalaryFeature } from './feature';

const $member = fellowshipEvidenceSalaryFeature.input.map(store => (store ? store.member : null));

sample({
  clock: fellowshipEvidenceSalaryFeature.running,
  target: track.request,
});

export const profile = {
  $member,
};
