import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { identity } from '@/domains/network';

import { fellowshipReferendumsDetailsFeature } from './feature';

const $identities = combine(fellowshipReferendumsDetailsFeature.input, identity.$list, (featureInput, list) => {
  if (nullable(featureInput)) return {};

  return list[featureInput.chainId] ?? {};
});

export const identityModel = {
  $identities,
};
