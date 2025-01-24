import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Box } from '@/shared/ui-kit';

export const LastActivity = memo(() => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col rounded-xl border border-filter-border bg-card-background">
      <Box direction="row" verticalAlign="center" gap={1.5} padding={[4, 5]}>
        <span className="text-button-small">{t('fellowship.activityFeed.lastActivityCardTitle')}</span>
      </Box>
    </div>
  );
});
