import { combine } from 'effector';

import { identityDomain } from '@/domains/identity';

import { fellowshipActivityFeedFeature } from './feature';

const $list = combine(identityDomain.identity.$list, fellowshipActivityFeedFeature.state, (list, state) => {
  if (state.status !== 'running') return {};

  return list[state.data.chainId] ?? {};
});

export const identity = {
  $list,
};
