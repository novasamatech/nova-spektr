import { attach, combine, createEvent, sample } from 'effector';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { identity } from '@/domains/network';

import { fellowshipTasksFeature } from './feature';

const requestIdentityFx = attach({ effect: identity.request });
const $identities = combine(fellowshipTasksFeature.input, identity.$list, (input, identities) => {
  if (!input) return {};
  return identities[input.chainId];
});

const request = createEvent<{ accountId: AccountId }>();

const identityRequested = sample({
  clock: request,
  source: fellowshipTasksFeature.input,
  fn(input, { accountId }) {
    if (!input) return null;
    return {
      accounts: [accountId],
      chainId: input.chainId,
    };
  },
}).filterMap(params => {
  if (params !== null) {
    return params;
  }
});

sample({
  clock: identityRequested,
  target: requestIdentityFx,
});

export const identities = {
  $identities,
  request,
};
