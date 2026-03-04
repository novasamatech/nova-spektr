import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Dropdown } from '@/shared/ui-kit';
import { backendContactsModel } from '../model/backend-contacts-model';

function formatRelativeTime(timestamp: number, t: TFunction): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return t('addressBook.syncStatus.justNow');

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('addressBook.syncStatus.minutesAgo', { count: minutes });

  const hours = Math.floor(minutes / 60);

  return t('addressBook.syncStatus.hoursAgo', { count: hours });
}

function getStatusText(syncStatus: string, lastSyncTime: number | null, t: TFunction): string | null {
  if (syncStatus === 'syncing') return t('addressBook.syncStatus.syncing');
  if (syncStatus === 'error') return t('addressBook.syncStatus.failed');
  if (lastSyncTime) return formatRelativeTime(lastSyncTime, t);

  return null;
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

  const statusText = getStatusText(syncStatus, lastSyncTime, t);
  const isError = syncStatus === 'error';

  return (
    <Dropdown align="end" sideOffset={1}>
      <Dropdown.Trigger>
        <button
          type="button"
          className={cnTw(
            'flex items-center gap-x-1 rounded-md px-2 py-1 transition-colors',
            'hover:bg-action-background-hover',
            isError ? 'text-text-negative' : 'text-text-tertiary',
          )}
        >
          {statusText && <FootnoteText>{statusText}</FootnoteText>}
          <Icon className="shrink-0" name="down" size={16} />
        </button>
      </Dropdown.Trigger>

      <Dropdown.Content>
        <Dropdown.Item disabled={isLoading} onSelect={handleSync}>
          <Icon name="refresh" size={16} />
          {t('addressBook.syncStatus.syncNow')}
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown>
  );
};
