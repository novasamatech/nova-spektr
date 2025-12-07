import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { type NotificationStatus } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ButtonLink, Icon, type IconNames } from '@/shared/ui';
import { type NotificationToast, notificationModel } from '@/entities/notification';

const iconConfig: Record<NotificationStatus, { name: IconNames; className: string }> = {
  info: { name: 'info', className: 'text-icon-accent' },
  success: { name: 'checkmarkOutline', className: 'text-icon-positive' },
  error: { name: 'closeOutline', className: 'text-icon-negative' },
};

export const NotificationsPortal = () => {
  const { t } = useI18n();

  const showNotificationToast = useCallback(
    (notification: NotificationToast) => {
      const icon = iconConfig[notification.status];
      const title = t(notification.title, notification.titleParams);

      toast.custom(
        (toastId) => (
          <div className="relative flex w-[324px] items-start gap-x-2 rounded-lg border border-filter-border bg-white p-4 shadow-card-shadow">
            <div className="pt-0.5">
              <Icon name={icon.name} size={16} className={icon.className} />
            </div>
            <div className="flex flex-1 flex-col gap-y-3 pr-6">
              <div className="flex flex-col gap-y-1">
                <div className="text-sm font-medium text-text-primary">{title}</div>
                {notification.description && (
                  <div className="text-sm text-text-secondary">{notification.description}</div>
                )}
              </div>
              {notification.deepLink && (
                <ButtonLink
                  to={notification.deepLink.link}
                  variant="text"
                  pallet="primary"
                  inline
                  onClick={() => toast.dismiss(toastId)}
                >
                  {t(notification.deepLink.title)}
                </ButtonLink>
              )}
            </div>
            <button
              className="absolute top-4 right-4 cursor-pointer text-icon-default hover:text-icon-hover"
              onClick={() => toast.dismiss(toastId)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ),
        {
          duration: 10000,
        },
      );
    },
    [t],
  );

  useEffect(() => {
    // eslint-disable-next-line effector/no-watch
    const unsubscribe = notificationModel.events.batchedNotificationsReady.watch((notifications) => {
      for (const notification of notifications) {
        showNotificationToast(notification);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [showNotificationToast]);

  return null;
};
