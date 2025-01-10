import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationBottomLinksPipeline } from '@/features/app-shell';

export const settingsNavigationFeature = createFeature({
  name: 'settings/navigation',
  enable: $features.map(({ settings }) => settings),
});

settingsNavigationFeature.inject(navigationBottomLinksPipeline, (items) => {
  return items.concat({
    order: 2,
    icon: 'settings',
    title: 'navigation.settingsLabel',
    link: Paths.SETTINGS,
  });
});
