import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';
import { notificationModel } from '@/entities/notification';

export const EmptyNotifications = () => {
  const { t } = useI18n();

  const notifications = useUnit(notificationModel.$notifications);

  if (notifications.length > 0) {
    return null;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <Graphics name="emptyList" size={178} />
      <BodyText className="text-text-tertiary">{t('notifications.noNotificationsDescription')}</BodyText>
    </div>
  );
};
