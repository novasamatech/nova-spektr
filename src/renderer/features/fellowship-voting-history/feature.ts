import { sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

export const fellowshipVotingHistoryFeature = createFeature({
  name: 'fellowship/voting history',
  enable: $features.map(({ fellowship }) => fellowship),
});

sample({
  clock: fellowshipNetwork.$isConnected,
  filter: fellowshipNetwork.$isConnected,
  target: fellowshipVotingHistoryFeature.restore,
});
