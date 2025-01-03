import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationTopLinksPipeline } from '@/features/app-shell';

export const stakingNavigationFeature = createFeature({
  name: 'staking/navigation',
  input: createStore({}),
  enable: $features.map(({ staking }) => staking),
});

stakingNavigationFeature.inject(navigationTopLinksPipeline, (items) => {
  return items.concat({ order: 1, icon: 'staking', title: 'navigation.stakingLabel', link: Paths.STAKING });
});
