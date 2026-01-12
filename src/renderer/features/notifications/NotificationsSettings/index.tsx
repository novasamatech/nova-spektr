import { createFeature } from '@/shared/feature';
import { generalActionsSlot } from '@/pages/Settings/Overview/components';

import { notificationsSettingsModel } from './model/notifications-settings-model';
import { NotificationsSettingsModal } from './ui/NotificationsSettingsModal';

export const notificationsSettingsFeature = createFeature({
  name: 'notifications/settings',
});

export { notificationsSettingsModel, NotificationsSettingsModal };

notificationsSettingsFeature.inject(generalActionsSlot, {
  order: 1,
  render: () => <NotificationsSettingsModal />,
});
