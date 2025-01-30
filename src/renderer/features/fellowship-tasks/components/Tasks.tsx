import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Box, Surface } from '@/shared/ui-kit';

export const Tasks = memo(() => {
  const { t } = useI18n();

  return (
    <div className="col-span-2 flex h-[504px] flex-col rounded-xl border border-filter-border bg-card-background">
      <Box direction="row" verticalAlign="center" gap={1.5} padding={[4, 5]}>
        <span className="text-button-small">{t('fellowship.tasks.cardTitle')}</span>
        <span className="text-footnote text-text-tertiary">{0}</span>
      </Box>
      <Box padding={[0, 5, 4]} grow={1}>
        <Surface elevation={1} className="h-full rounded-xl" />
      </Box>
    </div>
  );
});
