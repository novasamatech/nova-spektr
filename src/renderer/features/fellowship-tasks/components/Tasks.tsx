import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { groupBy, nullable } from '@/shared/lib/utils';
import { FootnoteText, Icon, Loader, SmallTitleText } from '@/shared/ui';
import { AsyncItem, Box, EmptyMessage, ScrollArea, Tabs } from '@/shared/ui-kit';
import { fellowshipTasksFeature } from '../model/feature';
import { memberProfile } from '../model/memberProfile';
import { tasks } from '../model/tasks';

import { Basket } from './Basket';
import { TasksGroup } from './TasksGroup';

export const Tasks = () => {
  const [selectedTab, setSelectedTab] = useState('referendums');
  const { t } = useI18n();
  const input = useUnit(fellowshipTasksFeature.input);
  const activeTasks = useUnit(tasks.$list);
  const pending = useUnit(tasks.pending);
  const hasAccount = useUnit(memberProfile.$hasAccount);

  const groups = useMemo(() => groupBy(activeTasks, task => task.group), [activeTasks]);

  const activeCount = groups.active?.length ?? 0;
  const tasksCount = groups.tasks?.length ?? 0;
  const referendumCount = (groups.active?.length ?? 0) + (groups.voted?.length ?? 0) + (groups.completed?.length ?? 0);

  if (nullable(input) || pending) {
    return (
      <div className="flex h-full grow flex-col items-center justify-center overflow-hidden rounded-xl border border-filter-border bg-card-background">
        <Loader color="primary" size={24} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-stretch justify-stretch overflow-hidden rounded-xl border border-filter-border">
      <Tabs value={selectedTab} onChange={setSelectedTab}>
        <div className="w-full border-b border-filter-border bg-white">
          <Box padding={[4, 3, 2]} shrink={0} width="fit-content" alignSelf="flex-start">
            <Tabs.List>
              <Tabs.Trigger value="referendums">
                <div className="flex min-w-[100px] items-center justify-center gap-1">
                  <span>{t('fellowship.referendums.tab')}</span>
                  <span className="text-text-tertiary">{activeCount.toString()}</span>
                </div>
              </Tabs.Trigger>
              <Tabs.Trigger value="tasks">
                <div className="flex min-w-[100px] items-center justify-center gap-1">
                  <span>{t('fellowship.tasks.tab')}</span>
                  <span className="text-text-tertiary">{tasksCount.toString()}</span>
                </div>
              </Tabs.Trigger>
            </Tabs.List>
          </Box>
        </div>

        <Tabs.Content value="referendums">
          {hasAccount && referendumCount > 0 && (
            <ScrollArea>
              {groups.active && <TasksGroup key="active" title={t('fellowship.tasks.active')} group={groups.active} />}
              {groups.voted && <TasksGroup key="voted" title={t('fellowship.tasks.voted')} group={groups.voted} />}
              {groups.completed && (
                <TasksGroup key="completed" title={t('fellowship.tasks.completed')} group={groups.completed} async />
              )}
            </ScrollArea>
          )}
        </Tabs.Content>

        <Tabs.Content value="tasks">
          <ScrollArea>
            {hasAccount && tasksCount > 0 && (
              <div className="divide-y divide-filter-border bg-card-background">
                {groups?.tasks?.map(({ id, body: Component, meta }) => (
                  <AsyncItem key={id} strategy="sync">
                    <Component {...meta} />
                  </AsyncItem>
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs.Content>
      </Tabs>

      {hasAccount ? (
        ((selectedTab === 'referendums' && referendumCount === 0) || (selectedTab === 'tasks' && tasksCount === 0)) && (
          <AllDone />
        )
      ) : (
        <AccountNotFound />
      )}
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
  const chainName = useUnit(tasks.$chainName);

  return (
    <EmptyMessage
      title={t('fellowship.tasks.noAccountTitle')}
      description={t('fellowship.tasks.noAccountDescription', { chain: chainName })}
    />
  );
};
