import { useUnit } from 'effector-react';
import { memo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Box } from '@/shared/ui-kit';
import { tasks } from '../model/tasks';

import { Stack } from './Stack';

export const Tasks = memo(() => {
  const { t } = useI18n();
  const activeTasks = useUnit(tasks.$list);
  const [active, setActive] = useState(0);

  const nextTask = () => setActive(a => a + 1);

  const cards = activeTasks.map(({ id, body: Component }) => {
    return {
      id,
      node: <Component canSkip={activeTasks.length > 1} onSkip={nextTask} />,
    };
  });

  return (
    <div className="col-span-2 flex h-[504px] flex-col overflow-hidden rounded-xl border border-filter-border bg-card-background">
      <Box direction="row" verticalAlign="center" gap={1.5} padding={[4, 5]}>
        <span className="text-button-small">{t('fellowship.tasks.cardTitle')}</span>
        <span className="text-footnote text-text-tertiary">{activeTasks.length}</span>
      </Box>
      <Box padding={[0, 5, 4]} grow={1}>
        <Stack active={active} cards={cards} />
      </Box>
    </div>
  );
});
