import { memo, useState } from 'react';

import { createPipeline } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { BodyText, Button, TitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type TaskDescription } from '../types';

import { Stack } from './Stack';

export const tasksPipeline = createPipeline<TaskDescription[]>({
  name: 'tasksPipeline',
  postprocess(tasks) {
    return tasks.sort((a, b) => a.priority - b.priority);
  },
});

export const Tasks = memo(() => {
  const { t } = useI18n();
  // const tasks = usePipeline(tasksPipeline, []);

  const [active, setActive] = useState(0);

  const tasksCount = 10;

  const nextTask = () => setActive(a => a + 1);

  const createTask = (i: number) => ({
    id: 1,
    priority: 0,
    title: `Test Task ${i}`,
    body: (
      <Box padding={5} gap={5} fillContainer>
        <TitleText>Test Task {i}</TitleText>
        <BodyText>
          From now you can submit an evidence that will demonstrate that you are qualified for a new Rank (Rank IV).
          Submit the promotion request form, and your submission will be reviewed by other fellows to determine if you
          meet the requirements for this Rank.
        </BodyText>
        <Box fillContainer grow={1}></Box>
        <Box direction="row" horizontalAlign="space-between">
          <Button variant="text" onClick={nextTask}>
            Skip for now
          </Button>
          <Button variant="fill">Submit</Button>
        </Box>
      </Box>
    ),
    action: () => {},
  });

  const tasks = Array.from({ length: tasksCount }).map((_, i) => createTask(i));
  const cards = tasks.map(({ body, id }) => {
    return {
      id,
      node: body,
    };
  });

  return (
    <div className="col-span-2 flex h-[504px] flex-col overflow-hidden rounded-xl border border-filter-border bg-card-background">
      <Box direction="row" verticalAlign="center" gap={1.5} padding={[4, 5]}>
        <span className="text-button-small">{t('fellowship.tasks.cardTitle')}</span>
        <span className="text-footnote text-text-tertiary">{0}</span>
      </Box>
      <Box padding={[0, 5, 4]} grow={1}>
        <Stack active={active} cards={cards} />
      </Box>
    </div>
  );
});
