import { sample } from 'effector';
import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { Paths } from '@/shared/routes';
import { notificationModel } from '@/entities/notification';
import { faviconModel, NavItem, navigationBottomLinksSlot } from '@/features/app-shell';

export const notificationsNavigationFeature = createFeature({
  name: 'notifications/navigation',
  enable: $features.map(({ notifications }) => notifications),
});

const BADGE_SOURCE = 'notifications';

sample({
  clock: notificationModel.$hasUnread,
  filter: (hasUnread) => hasUnread,
  fn: () => BADGE_SOURCE,
  target: faviconModel.events.badgeSourceAdded,
});

sample({
  clock: notificationModel.$hasUnread,
  filter: (hasUnread) => !hasUnread,
  fn: () => BADGE_SOURCE,
  target: faviconModel.events.badgeSourceRemoved,
});

notificationsNavigationFeature.inject(navigationBottomLinksSlot, {
  order: 1,
  render() {
    const [hasUnread, unreadCount] = useUnit([notificationModel.$hasUnread, notificationModel.$unreadCount]);

    return (
      <NavItem
        icon="notification"
        title="navigation.notificationsLabel"
        link={Paths.NOTIFICATIONS}
        badge={
          hasUnread ? (
            <div className="ml-auto flex items-center gap-x-2">
              <span className="text-text-tertiary">{unreadCount}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-icon-accent" />
            </div>
          ) : null
        }
      />
    );
  },
});
