import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { identity } from '@/domains/network';

import { fellowshipActivityFeedFeature } from './feature';
import { fellowship } from './fellowship';

const $members = fellowship.$store.map(store => store?.members ?? []);
const $list = combine(identity.$list, fellowshipActivityFeedFeature.state, (list, state) => {
  if (state.status !== 'running') return {};

  return list[state.data.chainId] ?? {};
});

sample({
  clock: attachToFeatureInput(fellowshipActivityFeedFeature, $members),
  filter({ data: members }) {
    return members.length > 0;
  },
  fn({ input, data: members }) {
    return {
      chainId: input.chainId,
      accounts: members.map(m => m.accountId),
    };
  },
  target: identity.request,
});

export const identityModel = {
  $list,
};
