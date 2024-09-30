import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@shared/effector';
import { identityDomain } from '@/domains/identity';

import { membersModel } from './members';
import { membersFeatureStatus } from './status';

const membersUpdate = attachToFeatureInput(membersFeatureStatus, membersModel.$list);

const $identity = combine(identityDomain.identity.$list, membersFeatureStatus.state, (list, state) => {
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
