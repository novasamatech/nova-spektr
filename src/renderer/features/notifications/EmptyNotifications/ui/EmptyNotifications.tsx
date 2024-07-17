import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';

import { BodyText, Icon } from '@shared/ui';

import { notificationModel } from '@entities/notification';

export const EmptyNotifications = () => {
  const { t } = useI18n();

  const notifications = useUnit(notificationModel.$notifications);

  if (notifications.length > 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full items-center justify-center">
      <Icon as="img" name="emptyList" size={178} />
      <BodyText className="text-text-tertiary">{t('notifications.noNotificationsDescription')}</BodyText>
    </div>
  );
};
