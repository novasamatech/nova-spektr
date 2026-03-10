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

function getStatusText(syncStatus: string, lastSyncTime: number | null, t: TFunction): string | null {
  if (syncStatus === 'syncing') return t('addressBook.syncStatus.syncing');
  if (syncStatus === 'error') return t('addressBook.syncStatus.failed');
  if (lastSyncTime) return formatRelativeTime(lastSyncTime, t);

  return null;
}

export const SyncStatusBadge = () => {
  const { t } = useI18n();

  const syncStatus = useUnit(backendContactsModel.$syncStatusThrottled);
  const lastSyncTime = useUnit(backendContactsModel.$lastSyncTime);

  const [, setTick] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (!lastSyncTime) return;

    const interval = setInterval(() => setTick((n) => n + 1), 60_000);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const handleSync = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    backendContactsModel.events.syncTriggered();
  };

  const statusText = getStatusText(syncStatus, lastSyncTime, t);
  const isError = syncStatus === 'error';

  return (
    <div className="flex items-center gap-x-1">
      {statusText && (
        <FootnoteText className={cnTw(isError ? 'text-text-negative' : 'text-text-tertiary')}>
          {statusText}
        </FootnoteText>
      )}
      <Tooltip>
        <Tooltip.Trigger>
          <div
            className={cnTw('inline-flex', isSpinning && 'animate-[spin_600ms_linear]')}
            onAnimationEnd={() => setIsSpinning(false)}
          >
            <IconButton
              name="refresh"
              size={16}
              className="cursor-pointer"
              ariaLabel={t('addressBook.syncStatus.syncNow')}
              onClick={handleSync}
            />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>{t('addressBook.syncStatus.syncNow')}</Tooltip.Content>
      </Tooltip>
    </div>
  );
};
