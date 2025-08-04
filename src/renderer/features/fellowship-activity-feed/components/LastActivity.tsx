import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { ScrollArea } from '@/shared/ui-kit';

import { ActivityList } from './ActivityList';
import { ActivityModal } from './ActivityModal';

export const LastActivity = memo(() => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-filter-border bg-card-background">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-filter-border bg-card-background pr-2 pl-4">
        <span className="text-button-small">{t('fellowship.activityFeed.lastActivityCardTitle')}</span>

        <ActivityModal>
          <Button variant="text" pallet="primary" size="sm">
            {t('fellowship.activityFeed.viewList')}
          </Button>
        </ActivityModal>
      </div>
      <ScrollArea>
        <ActivityList />
      </ScrollArea>
    </div>
  );
});
