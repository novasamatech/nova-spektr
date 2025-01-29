import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { identityDomain } from '@/domains/identity';

import { fellowshipMembersFeature } from './feature';
import { membersModel } from './members';

const membersUpdate = attachToFeatureInput(fellowshipMembersFeature, membersModel.$list);

const $identity = combine(identityDomain.identity.$list, fellowshipMembersFeature.state, (list, state) => {
  if (state.status !== 'running') return {};

  return list[state.data.chainId] ?? {};
});

sample({
  clock: membersUpdate,
  fn: ({ input: { chainId }, data: members }) => ({
    accounts: members.map(m => m.accountId),
    chainId,
  }),
  target: identityDomain.identity.request,
});

export const identityModel = {
  $identity,
};
