import { type ReactNode, memo } from 'react';

import { Accordion, AsyncItem, Box } from '@/shared/ui-kit';
import { type TaskDescription } from '../types';

type Props = {
  title: ReactNode;
  group: TaskDescription[];
  async?: boolean;
};

export const TasksGroup = memo(({ group, title, async = false }: Props) => {
  if (group.length === 0) return null;

  return (
    <Accordion initialOpen>
      <Accordion.Trigger>
        <Box direction="row" gap={2} padding={[0, 2]}>
          <span>{title}</span>
          <span className="text-text-tertiary">{group.length}</span>
        </Box>
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="divide-y divide-filter-border bg-card-background">
          {group.map(({ id, body: Component, meta }) => (
            <AsyncItem key={id} strategy={async ? 'async' : 'sync'}>
              <Component {...meta} />
            </AsyncItem>
          ))}
        </div>
      </Accordion.Content>
    </Accordion>
  );
});
