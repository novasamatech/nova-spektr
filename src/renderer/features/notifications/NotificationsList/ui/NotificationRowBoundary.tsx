import { type PropsWithChildren } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { type Notification } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';

type Props = PropsWithChildren<{
  notification: Notification;
}>;

/**
 * Isolates one notification from the rest of the list: a notification that
 * throws while rendering is replaced by a small placeholder instead of
 * propagating to the app-wide boundary and replacing the whole screen. The
 * boundary clears when the notification object changes.
 */
export const NotificationRowBoundary = ({ notification, children }: Props) => {
  return (
    <ErrorBoundary
      resetKeys={[notification]}
      fallback={<NotificationRowFallback />}
      onError={(error) => {
        console.error('[notifications] notification failed to render', { id: notification.id }, error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

const NotificationRowFallback = () => {
  const { t } = useI18n();

  return <FootnoteText className="text-text-tertiary">{t('notifications.rowUnavailable')}</FootnoteText>;
};
