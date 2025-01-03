import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationTopLinksPipeline } from '@/features/app-shell';

export const fellowshipNavigationFeature = createFeature({
  name: 'fellowship/navigation',
  enable: $features.map(({ fellowship }) => fellowship),
});

fellowshipNavigationFeature.inject(navigationTopLinksPipeline, items => {
  return items.concat({ order: 3, icon: 'fellowshipNav', title: 'navigation.fellowship', link: Paths.FELLOWSHIP });
});
