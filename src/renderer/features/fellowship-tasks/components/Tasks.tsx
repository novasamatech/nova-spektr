import { useUnit } from 'effector-react';
import { memo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { FootnoteText, Icon, Loader, SmallTitleText } from '@/shared/ui';
import { Box, EmptyMessage } from '@/shared/ui-kit';
import { fellowshipTasksFeature } from '../model/feature';
import { memberProfile } from '../model/memberProfile';
import { tasks } from '../model/tasks';

import { Basket } from './Basket';
import { Stack } from './Stack';

export const Tasks = memo(() => {
  const { t } = useI18n();
  const input = useUnit(fellowshipTasksFeature.input);
  const activeTasks = useUnit(tasks.$list);
  const hasPermission = useUnit(memberProfile.$hasPermission);
  const pending = useUnit(tasks.pending);
  const hasAccount = useUnit(memberProfile.$hasAccount);
  const [active, setActive] = useState(0);

  if (nullable(input) || pending) {
    return (
      <div className="flex h-full grow flex-col items-center justify-center overflow-hidden rounded-xl border border-filter-border bg-card-background">
        <Loader color="primary" />
      </div>
    );
  }

  const nextTask = () => setActive(a => a + 1);

  const cards = activeTasks.map(({ id, body: Component, meta }) => {
    return {
      id,
      node: <Component {...meta} canSkip={activeTasks.length > 1} onSkip={nextTask} />,
    };
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-filter-border bg-card-background">
      <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2} padding={[4, 5]} shrink={0}>
        <Box direction="row" height={6.5} verticalAlign="center" gap={1.5}>
          <span className="text-button-small">{t('fellowship.tasks.cardTitle')}</span>
          <span className="text-footnote text-text-tertiary">{activeTasks.length}</span>
        </Box>
        <Basket />
      </Box>
      {hasAccount && hasPermission && activeTasks.length ? (
        <Box padding={[0, 5, 4]} grow={1}>
          <Stack active={active} cards={cards} />
        </Box>
      ) : null}
      {hasAccount && hasPermission && !activeTasks.length ? <AllDone /> : null}
      {!hasAccount ? <AccountNotFound /> : null}
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
