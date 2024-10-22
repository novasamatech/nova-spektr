import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationBottomLinks } from '@/features/app-shell';

export const settingsNavigationFeature = createFeature({
  name: 'Settings navigation',
  enable: $features.map(({ settings }) => settings),
});

settingsNavigationFeature.inject(navigationBottomLinks, (items) => {
  return items.concat({
    order: 4,
    icon: 'settings',
    title: 'navigation.settingsLabel',
    link: Paths.SETTINGS,
  });
});
