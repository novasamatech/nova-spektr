import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { ScrollArea } from '@/shared/ui-kit';

import { ActivityList } from './ActivityList';

export const LastActivity = memo(() => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-filter-border bg-card-background">
      <div className="flex h-11 shrink-0 items-center border-b border-filter-border bg-card-background px-4">
        <span className="text-button-small">{t('fellowship.activityFeed.lastActivityCardTitle')}</span>
      </div>
      <ScrollArea>
        <ActivityList />
      </ScrollArea>
    </div>
  );
});
