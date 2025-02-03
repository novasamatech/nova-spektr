import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Box, ScrollArea } from '@/shared/ui-kit';
import { activity } from '../model/activity';

export const ActivityFeed = () => {
  const { t } = useI18n();
  const list = useUnit(activity.$list);

  return (
    <Box>
      <Box direction="row" padding={[5.5, 5]} gap={2}>
        <span className="text-caption uppercase text-text-secondary">{t('fellowship.profile.activity')}</span>
        <span className="text-caption uppercase text-text-tertiary">0</span>
      </Box>
      <ScrollArea>
        <Box padding={[0, 3, 5]} gap={6}>
          {list.map(x => (
            <div key={`${x.type}-${x.block}`} className="px-2">
              {x.type}
            </div>
          ))}
        </Box>
      </ScrollArea>
    </Box>
  );
};
