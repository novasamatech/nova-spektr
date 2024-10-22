import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationBottomLinks } from '@/features/app-shell';

export const notificationsNavigationFeature = createFeature({
  name: 'Notifications navigation',
  enable: $features.map(({ notifications }) => notifications),
});

notificationsNavigationFeature.inject(navigationBottomLinks, (items) => {
  return items.concat({
    order: 4,
    icon: 'notification',
    title: 'navigation.notificationsLabel',
    link: Paths.NOTIFICATIONS,
  });
});
