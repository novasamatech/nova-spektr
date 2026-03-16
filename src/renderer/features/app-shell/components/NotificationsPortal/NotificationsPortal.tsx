import { useUnit } from 'effector-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { type NotificationStatus } from '@/shared/core';
import { ButtonLink, Icon } from '@/shared/ui';
import { type ToastData, notificationModel } from '@/entities/notification';

const TOAST_DURATION = 5000;

const getIconForStatus = (status: NotificationStatus) => {
  switch (status) {
    case 'success':
      return <Icon name="checkmarkOutline" size={16} className="text-icon-positive" />;
    case 'error':
      return <Icon name="closeOutline" size={16} className="text-icon-negative" />;
    case 'info':
    default:
      return <Icon name="info" size={16} className="text-icon-accent" />;
  }
};

export const NotificationsPortal = () => {
  const { t } = useTranslation();
  const toasts = useUnit(notificationModel.$toasts);

  useEffect(() => {
    for (const toastData of toasts) {
      showToast(toastData);
    }

    function showToast({ title, description, status, link, count }: ToastData) {
      // If count is provided, this is a batched notification - translate title and description
      const displayTitle = count ? t(title, { count }) : title;
      const displayDescription = count && description ? t(description) : description;

      toast.custom(
        (toastId) => (
          <div className="flex w-[356px] items-start gap-2 rounded-lg bg-card-background p-3 shadow-card-shadow">
            <div className="mt-0.5 shrink-0">{getIconForStatus(status)}</div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-body-bold text-text-primary">{displayTitle}</span>
              {displayDescription && <span className="text-footnote text-text-tertiary">{displayDescription}</span>}
              {link && (
                <ButtonLink
                  to={link.path}
                  variant="text"
                  pallet="primary"
                  size="sm"
                  className="mt-1 justify-start p-0"
                  onClick={() => toast.dismiss(toastId)}
                >
                  {t(link.title)}
                </ButtonLink>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 text-icon-default hover:text-icon-hover"
              onClick={() => toast.dismiss(toastId)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ),
        {
          duration: TOAST_DURATION,
        },
      );
    }
  }, [toasts]);

  return null;
};
