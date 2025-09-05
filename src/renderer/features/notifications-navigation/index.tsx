import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { Paths } from '@/shared/routes';
import { notificationModel } from '@/entities/notification';
import { NavItem, navigationBottomLinksSlot } from '@/features/app-shell';

export const notificationsNavigationFeature = createFeature({
  name: 'notifications/navigation',
  enable: $features.map(({ notifications }) => notifications),
});

notificationsNavigationFeature.inject(navigationBottomLinksSlot, {
  order: 1,
  render() {
    const hasUnread = useUnit(notificationModel.$hasUnread);

    return (
      <NavItem
        icon="notification"
        title="navigation.notificationsLabel"
        link={Paths.NOTIFICATIONS}
        badge={hasUnread ? <span className="relative -top-1 ml-2 h-1.5 w-1.5 rounded-full bg-icon-accent" /> : null}
      />
    );
  },
});
