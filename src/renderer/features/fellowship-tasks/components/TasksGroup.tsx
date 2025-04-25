import { type ReactNode, memo } from 'react';

import { Accordion, AsyncItem, Box } from '@/shared/ui-kit';
import { type Referendum } from '@/domains/collectives';
import { type TaskDescription } from '../types';

type Props = {
  title: ReactNode;
  group: TaskDescription[];
  async?: boolean;
  onReferendumSelect(referendum: Referendum): void;
};

export const TasksGroup = memo(({ group, title, async = false, onReferendumSelect }: Props) => {
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
            <AsyncItem key={id} sync={!async}>
              <Component {...meta} onReferendumSelect={onReferendumSelect} />
            </AsyncItem>
          ))}
        </div>
      </Accordion.Content>
    </Accordion>
  );
});
