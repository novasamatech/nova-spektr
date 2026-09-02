import { useDeferredValue, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton } from '@/shared/ui';
import { DashboardWidget } from '@/pages/Dashboard';
import { useLocksTable } from '../hooks/useLocksTable';

import { LocksTable } from './LocksTable';
import { LocksTotals } from './LocksTotals';
import { UnlockScheduleFullScreen } from './UnlockScheduleFullScreen';
import { WidgetEmptyState } from './WidgetEmptyState';

type Props = {
  accountIds: string[];
};

/**
 * Plain function component on purpose: the slot render system calls it directly
 * as a function, so it must never be wrapped in `memo`/`lazy`/`forwardRef`.
 */
export const UnlockScheduleWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const deferredAccountIds = useDeferredValue(accountIds);
  const [fullScreen, setFullScreen] = useState(false);

  const state = useLocksTable(deferredAccountIds);
  const { rows, totals, currency, showTotals } = state;

  if (accountIds.length === 0) {
    return (
      <DashboardWidget>
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <FootnoteText className="text-text-tertiary">{t('dashboard.unlockSchedule.title')}</FootnoteText>
          <WidgetEmptyState
            title={t('dashboard.noSelection.title')}
            description={t('dashboard.noSelection.governanceDescription')}
          />
        </div>
      </DashboardWidget>
    );
  }

  return (
    <DashboardWidget>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex items-center gap-2">
          <span title={t('dashboard.unlockSchedule.fullView')} className="shrink-0">
            <IconButton
              name="expand"
              size={16}
              ariaLabel={t('dashboard.unlockSchedule.fullView')}
              onClick={() => setFullScreen(true)}
            />
          </span>
          <FootnoteText className="text-text-tertiary">
            {t('dashboard.unlockSchedule.title')}
            {rows.length > 0 && (
              <span>
                {' · '}
                {t('dashboard.governanceLocks.rowsCount', { count: rows.length })}
              </span>
            )}
          </FootnoteText>
        </div>

        {showTotals && totals && (
          <div className="mt-3">
            <LocksTotals totals={totals} currency={currency} />
          </div>
        )}

        <LocksTable mode="compact" state={state} rows={rows} />
      </div>

      <UnlockScheduleFullScreen state={state} isOpen={fullScreen} onToggle={setFullScreen} />
    </DashboardWidget>
  );
};
