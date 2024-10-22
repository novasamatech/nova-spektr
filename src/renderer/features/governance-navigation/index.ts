import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationTopLinks } from '@/features/app-shell';

export const governanceNavigationFeature = createFeature({
  name: 'Governance navigation',
  enable: $features.map(({ governance }) => governance),
});

governanceNavigationFeature.inject(navigationTopLinks, (items) => {
  return items.concat({ order: 2, icon: 'governance', title: 'navigation.governance', link: Paths.GOVERNANCE });
});
