import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationTopLinksPipeline } from '@/features/app-shell';

export const governanceNavigationFeature = createFeature({
  name: 'governance/navigation',
  enable: $features.map(({ governance }) => governance),
});

governanceNavigationFeature.inject(navigationTopLinksPipeline, (items) => {
  return items.concat({ order: 2, icon: 'governance', title: 'navigation.governance', link: Paths.GOVERNANCE });
});
