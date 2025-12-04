import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { type Notification, type NotificationStatus } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ButtonLink, Icon, type IconNames } from '@/shared/ui';
import { notificationModel } from '@/entities/notification';

const iconConfig: Record<NotificationStatus, { name: IconNames; className: string }> = {
  info: { name: 'info', className: 'text-icon-accent' },
  success: { name: 'checkmarkOutline', className: 'text-icon-positive' },
  error: { name: 'closeOutline', className: 'text-icon-negative' },
};

export const NotificationsPortal = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const showNotificationToast = useCallback(
    (notification: Notification) => {
      const icon = iconConfig[notification.status];

      toast.custom(
        (toastId) => (
          <div className="flex items-start gap-x-2 rounded-lg border border-filter-border bg-white p-4 shadow-card-shadow">
            <div className="pt-0.5">
              <Icon name={icon.name} size={16} className={icon.className} />
            </div>
            <div className="flex flex-1 flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <div className="text-sm font-medium text-text-primary">{notification.title}</div>
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
          </div>
        ),
        {
          // TODO: Revert to 5000
          duration: 600000,
        },
      );
    },
    [navigate, t],
  );

  useEffect(() => {
    // eslint-disable-next-line effector/no-watch
    const unsubscribe = notificationModel.events.notificationsAddedComplete.watch((notifications) => {
      for (const notification of notifications) {
        showNotificationToast(notification);
      }
    });

    return unsubscribe;
  }, [showNotificationToast]);

  return null;
};
