import { combine } from 'effector';

import { createFeature } from '@/shared/feature';
import { networkModel } from '@/entities/network';

const $input = combine({ chains: networkModel.$chains });

export const fellowshipBasketFeature = createFeature({
  name: 'fellowship/basket',
  input: $input,
});
