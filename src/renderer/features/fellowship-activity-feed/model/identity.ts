import { combine } from 'effector';

import { identity } from '@/domains/network';

import { fellowshipActivityFeedFeature } from './feature';

const $list = combine(identity.$list, fellowshipActivityFeedFeature.state, (list, state) => {
  if (state.status !== 'running') return {};

  return list[state.data.chainId] ?? {};
});

export const identityModel = {
  $list,
};
