import { createFeature } from '@/shared/feature';
import { generalActionsSlot } from '@/pages/Settings/Overview/components';

import { NotificationsSettingsModal } from './ui/NotificationsSettingsModal';

const notificationsSettingsFeature = createFeature({
  name: 'notifications/settings',
});

notificationsSettingsFeature.inject(generalActionsSlot, {
  order: 1,
  render: () => <NotificationsSettingsModal />,
});

export { notificationsSettingsFeature };
