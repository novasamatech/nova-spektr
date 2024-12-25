import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { Accordion, Box, Skeleton } from '@/shared/ui-kit';
import { type Referendum } from '@/domains/collectives';
import { referendumListModel } from '../../model/list';

import { ListItemPlaceholder } from './ListItemPlaceholder';
import { ReferendumItem } from './ReferendumItem';

type Props = {
  isTitlesLoading: boolean;
  mixLoadingWithData: boolean;
  onSelect: (value: Referendum) => void;
};

const createPlaceholders = (size: number) => {
  return Array.from({ length: size }, (_, index) => <ListItemPlaceholder key={`placeholder${index}`} />);
};

export const CompletedReferendums = memo<Props>(({ isTitlesLoading, mixLoadingWithData, onSelect }) => {
  const { t } = useI18n();
  const [referendums, pending] = useUnit([referendumListModel.$completed, referendumListModel.$pending]);

  const { isLoading: shouldRenderLoadingState, list: deferredReferendums } = useDeferredList({
    isLoading: pending,
    list: referendums,
  });

  const placeholdersCount = shouldRenderLoadingState
    ? Math.min(referendums.length || 4, 50)
    : Math.max(1, 3 - referendums.length);

  if (!pending && referendums.length === 0) return null;

  return (
    <Accordion initialOpen>
      <Accordion.Trigger>
        <Box direction="row" gap={2} verticalAlign="center">
          <span>{t('governance.referendums.completed')}</span>
          <span className="text-text-tertiary">
            <Skeleton active={shouldRenderLoadingState}>{referendums.length.toString()}</Skeleton>
          </span>
        </Box>
      </Accordion.Trigger>
      <Accordion.Content>
        <Box gap={2} padding={[2, 0, 0]}>
          {(!shouldRenderLoadingState || mixLoadingWithData) &&
            deferredReferendums.map(referendum => (
              <ReferendumItem
                key={referendum.id}
                referendum={referendum}
                isTitlesLoading={isTitlesLoading}
                onSelect={onSelect}
              />
            ))}
          {(shouldRenderLoadingState || mixLoadingWithData) && createPlaceholders(placeholdersCount)}
        </Box>
      </Accordion.Content>
    </Accordion>
  );
});
