import { attach, combine, createEvent, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { identity } from '@/domains/network';

import { fellowshipTasksFeature } from './feature';

const requestIdentityFx = attach({ effect: identity.request });
const $identities = combine(fellowshipTasksFeature.input, identity.$list, (input, identities) => {
  if (!input) return {};
  return identities[input.chainId] ?? {};
});

const request = createEvent<{ accountId: AccountId }>();

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, request),
  fn({ input, data: { accountId } }) {
    return {
      accounts: [accountId],
      chainId: input.chainId,
    };
  },
  target: requestIdentityFx,
});

export const identities = {
  $identities,
  request,
};
