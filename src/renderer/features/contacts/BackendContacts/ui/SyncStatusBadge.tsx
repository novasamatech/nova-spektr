import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, IconButton } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { backendContactsModel } from '../model/backend-contacts-model';

function formatRelativeTime(timestamp: number, t: TFunction): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return t('addressBook.syncStatus.justNow');

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('addressBook.syncStatus.minutesAgo', { count: minutes });

  const hours = Math.floor(minutes / 60);

  return t('addressBook.syncStatus.hoursAgo', { count: hours });
}

export const SyncStatusBadge = () => {
  const { t } = useI18n();
  const [syncStatus, lastSyncTime, isLoading] = useUnit([
    backendContactsModel.$syncStatus,
    backendContactsModel.$lastSyncTime,
    backendContactsModel.$isLoading,
  ]);

  const [, setTick] = useState(0);

  useEffect(() => {
    if (!lastSyncTime) return;

    const interval = setInterval(() => setTick((n) => n + 1), 60_000);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const handleSync = () => {
    backendContactsModel.events.syncTriggered();
  };

  const statusText =
    syncStatus === 'syncing'
      ? t('addressBook.syncStatus.syncing')
      : lastSyncTime
        ? formatRelativeTime(lastSyncTime, t)
        : null;

  return (
    <div className="flex items-center gap-x-1">
      {statusText && (
        <Tooltip enableHover delay={200}>
          <Tooltip.Trigger>
            <FootnoteText className="text-text-tertiary">{statusText}</FootnoteText>
          </Tooltip.Trigger>
          <Tooltip.Content>{lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : statusText}</Tooltip.Content>
        </Tooltip>
      )}
      <IconButton
        className={cnTw('shrink-0 text-icon-default', isLoading && 'animate-spin')}
        disabled={isLoading}
        name="refresh"
        ariaLabel={t('addressBook.syncStatus.syncButton')}
        onClick={handleSync}
      />
    </div>
  );
};
