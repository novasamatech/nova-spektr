import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { groupBy, nonNullable, nullable } from '@/shared/lib/utils';
import { FootnoteText, Icon, Loader, SmallTitleText } from '@/shared/ui';
import { Box, EmptyMessage, ScrollArea } from '@/shared/ui-kit';
import { useFellowshipAccount } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
import { useTasks } from '../hooks/useTasks';

import { Basket } from './Basket';
import { TasksGroup } from './TasksGroup';
import { Title } from './Title';

export const Tasks = () => {
  const { t } = useI18n();

  const api = useFellowshipApi();

  const { data: activeTasks, pending } = useTasks();
  const { data: account } = useFellowshipAccount();

  const hasAccount = nonNullable(account);
  const groups = useMemo(() => groupBy(activeTasks, task => task.group), [activeTasks]);

  const tasksCount = useMemo(() => {
    const personalCount = groups.personal?.length ?? 0;
    const generalCount = groups.general?.filter(task => !task.hasVoted).length ?? 0;
    return personalCount + generalCount;
  }, [groups]);

  if (nullable(api) || pending) {
    return (
      <div className="flex h-full grow flex-col items-center justify-center overflow-hidden rounded-xl border border-filter-border bg-card-background">
        <Loader color="primary" size={24} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-filter-border">
      <Title count={tasksCount} />
      {hasAccount && activeTasks.length ? (
        <ScrollArea>
          {groups.personal ? (
            <TasksGroup key="pesonal" title={t('fellowship.tasks.personal')} group={groups.personal} />
          ) : null}
          {groups.general ? (
            <TasksGroup key="general" title={t('fellowship.tasks.general')} group={groups.general} />
          ) : null}
          {groups.completed ? (
            <TasksGroup key="completed" title={t('fellowship.tasks.completed')} group={groups.completed} async />
          ) : null}
        </ScrollArea>
      ) : null}
      {hasAccount && !activeTasks.length ? <AllDone /> : null}
      {!hasAccount ? <AccountNotFound /> : null}
      <Basket />
    </div>
  );
};

const AllDone = () => {
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
};

const AccountNotFound = () => {
  const { t } = useI18n();
  const chain = useFellowshipChain();

  return (
    <EmptyMessage
      title={t('fellowship.tasks.noAccountTitle')}
      description={t('fellowship.tasks.noAccountDescription', { chain: chain?.name ?? 'Unknown' })}
    />
  );
};
