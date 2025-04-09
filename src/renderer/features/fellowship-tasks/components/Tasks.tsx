import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { groupBy, nullable } from '@/shared/lib/utils';
import { FootnoteText, Icon, Loader, SmallTitleText } from '@/shared/ui';
import { Box, EmptyMessage, ScrollArea } from '@/shared/ui-kit';
import { type Referendum } from '@/domains/collectives';
import { fellowshipTasksFeature } from '../model/feature';
import { memberProfile } from '../model/memberProfile';
import { tasks } from '../model/tasks';

import { Basket } from './Basket';
import { TasksGroup } from './TasksGroup';
import { Title } from './Title';

type Props = {
  onReferendumSelect(referendum: Referendum): void;
};

export const Tasks = memo(({ onReferendumSelect }: Props) => {
  const { t } = useI18n();
  const input = useUnit(fellowshipTasksFeature.input);
  const activeTasks = useUnit(tasks.$list);
  const hasPermission = useUnit(memberProfile.$hasPermission);
  const pending = useUnit(tasks.pending);
  const hasAccount = useUnit(memberProfile.$hasAccount);

  const groups = useMemo(() => groupBy(activeTasks, task => task.group), [activeTasks]);

  if (nullable(input) || pending) {
    return (
      <div className="flex h-full grow flex-col items-center justify-center overflow-hidden rounded-xl border border-filter-border bg-card-background">
        <Loader color="primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-filter-border">
      <Title />
      {hasAccount && hasPermission && activeTasks.length ? (
        <ScrollArea>
          {groups.personal ? (
            <TasksGroup
              key="pesonal"
              title={t('fellowship.tasks.personal')}
              group={groups.personal}
              onReferendumSelect={onReferendumSelect}
            />
          ) : null}
          {groups.general ? (
            <TasksGroup
              key="general"
              title={t('fellowship.tasks.general')}
              group={groups.general}
              onReferendumSelect={onReferendumSelect}
            />
          ) : null}
          {groups.completed ? (
            <TasksGroup
              key="completed"
              title={t('fellowship.tasks.completed')}
              group={groups.completed}
              onReferendumSelect={onReferendumSelect}
            />
          ) : null}
        </ScrollArea>
      ) : null}
      {(hasAccount && hasPermission && !activeTasks.length) || (hasAccount && !hasPermission) ? <AllDone /> : null}
      {!hasAccount ? <AccountNotFound /> : null}
      <Basket />
    </div>
  );
});

const AllDone = memo(() => {
  const { t } = useI18n();

  return (
    <Box verticalAlign="center" horizontalAlign="center" grow={1} gap={6}>
      <Icon name="document" size={64} />
      <Box gap={2} horizontalAlign="center" width="340px">
        <SmallTitleText className="text-center">{t('fellowship.tasks.emptyTitle')}</SmallTitleText>
        <FootnoteText className="text-center text-text-tertiary">{t('fellowship.tasks.emptyDescription')}</FootnoteText>
      </Box>
    </Box>
  );
});

const AccountNotFound = memo(() => {
  const { t } = useI18n();
  const chainName = useUnit(tasks.$chainName);

  return (
    <EmptyMessage
      title={t('fellowship.tasks.noAccountTitle')}
      description={t('fellowship.tasks.noAccountDescription', { chain: chainName })}
    />
  );
});
