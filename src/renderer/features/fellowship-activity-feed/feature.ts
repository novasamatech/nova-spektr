import { sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

export const fellowshipActivityFeedFeature = createFeature({
  name: 'fellowship/activity',
  enable: $features.map(({ fellowship }) => fellowship),
});

sample({
  clock: fellowshipNetwork.$isConnected,
  filter: fellowshipNetwork.$isConnected,
  target: fellowshipActivityFeedFeature.restore,
});
