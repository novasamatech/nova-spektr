import { sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { member, track } from '@/domains/collectives';
import { identity } from '@/domains/network';

import { fellowshipEvidenceSalaryFeature } from './feature';

const $member = fellowshipEvidenceSalaryFeature.input.map(store => (store ? store.member : null));

const memberUpdate = attachToFeatureInput(fellowshipEvidenceSalaryFeature, $member);

sample({
  clock: fellowshipEvidenceSalaryFeature.running,
  target: [member.subscribe, track.request],
});

sample({
  clock: fellowshipEvidenceSalaryFeature.stopped,
  target: member.unsubscribe,
});

sample({
  clock: memberUpdate,
  fn: ({ input: { chainId }, data: member }) => ({
    chainId,
    accounts: member ? [member.accountId] : [],
  }),
  target: identity.request,
});

export const profile = {
  $member,
};
