import { combine, sample } from 'effector';

import { member } from '@/domains/collectives';
import { identity } from '@/domains/network';

import { fellowshipActivityFeedFeature } from './feature';

const $list = combine(identity.$list, fellowshipActivityFeedFeature.state, (list, state) => {
  if (state.status !== 'running') return {};

  return list[state.data.chainId] ?? {};
});

sample({
  clock: member.receive,
  filter: ({ result }) => result.length > 0,
  fn: ({ params, result }) => ({
    chainId: params.chainId,
    accounts: result.map(m => m.accountId),
  }),
  target: identity.request,
});

export const identityModel = {
  $list,
};
