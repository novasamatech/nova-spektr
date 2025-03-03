import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Box, ScrollArea } from '@/shared/ui-kit';

import { ActivityList } from './ActivityList';

export const LastActivity = memo(() => {
  const { t } = useI18n();

  return (
    <div className="flex h-[504px] flex-col overflow-hidden rounded-xl border border-filter-border bg-card-background">
      <Box direction="row" verticalAlign="center" gap={1.5} padding={[4, 5]} height={15} shrink={0}>
        <span className="text-button-small">{t('fellowship.activityFeed.lastActivityCardTitle')}</span>
      </Box>
      <ScrollArea>
        <ActivityList />
      </ScrollArea>
    </div>
  );
});
