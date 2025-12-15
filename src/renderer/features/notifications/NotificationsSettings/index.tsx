import { generalActionsSlot } from '@/pages/Settings/Overview/components';

import { notificationsSettingsFeature } from './model/feature';
import { notificationsSettingsModel } from './model/notifications-settings-model';
import { NotificationsSettingsModal } from './ui/NotificationsSettingsModal';

export { notificationsSettingsModel, notificationsSettingsFeature };

notificationsSettingsFeature.inject(generalActionsSlot, {
  order: 1,
  render: () => <NotificationsSettingsModal />,
});
