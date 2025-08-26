import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { identity } from '@/domains/network';

import { fellowshipTasksFeature } from './feature';

const $identities = combine(fellowshipTasksFeature.input, identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

export const identityModel = {
  $identities,
};
