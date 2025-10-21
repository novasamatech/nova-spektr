import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { identity } from '@/domains/network';

import { fellowshipOverviewFeature } from './feature';
import { fellowship } from './fellowship';

const membersUpdate = attachToFeatureInput(fellowshipOverviewFeature, fellowship.$store);

const $identity = combine(identity.$list, fellowshipOverviewFeature.state, (list, state) => {
  if (state.status !== 'running') return {};

  return list[state.data.chainId] ?? {};
});

sample({
  clock: membersUpdate,
  fn: ({ input: { chainId }, data: fellowshipStore }) => ({
    accounts: fellowshipStore?.members?.map(m => m.accountId) ?? [],
    chainId,
  }),
  target: identity.request,
});

export const identityModel = {
  $identity,
};
