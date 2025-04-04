import { type ReactNode, memo } from 'react';

import { Accordion, Box } from '@/shared/ui-kit';
import { type Referendum } from '@/domains/collectives';
import { type TaskDescription } from '../types';

type Props = {
  title: ReactNode;
  group: TaskDescription[];
  onReferendumSelect(referendum: Referendum): void;
};

export const TasksGroup = memo(({ group, title, onReferendumSelect }: Props) => {
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
            <Component key={id} {...meta} onReferendumSelect={onReferendumSelect} />
          ))}
        </div>
      </Accordion.Content>
    </Accordion>
  );
});
