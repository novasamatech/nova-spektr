import { type ReactNode, memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useDeferredList } from '@/shared/lib/hooks';
import { Accordion, AsyncItem, Box } from '@/shared/ui-kit';
import { type TaskDescription } from '../types';

type Props = {
  title: ReactNode;
  group: TaskDescription[];
  async?: boolean;
};

export const TasksGroup = memo(({ group, title, async = false }: Props) => {
  const { list } = useDeferredList({ list: group, forceFirstRender: !async });

  if (list.length === 0) return null;

  return (
    <div data-testid={TEST_IDS.FELLOWSHIP.TASK_GROUP}>
      <Accordion initialOpen>
        <Accordion.Trigger>
          <Box direction="row" gap={2} padding={[0, 2]}>
            <span>{title}</span>
            <span className="text-text-tertiary">{group.length}</span>
          </Box>
        </Accordion.Trigger>
        <Accordion.Content>
          <div className="divide-y divide-filter-border bg-card-background">
            {list.map(({ id, body: Component, meta }) =>
              async ? (
                <AsyncItem key={id}>
                  <Component {...meta} />
                </AsyncItem>
              ) : (
                <Component key={id} {...meta} />
              ),
            )}
          </div>
        </Accordion.Content>
      </Accordion>
    </div>
  );
});
