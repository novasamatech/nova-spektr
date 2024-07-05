import { memo } from 'react';

import { useI18n } from '@app/providers';
import { Voted } from '@entities/governance';
import { FootnoteText, HeadlineText, Shimmering } from '@shared/ui';
import { type CompletedReferendum } from '@shared/core';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';
import { ListItem } from './ListItem';

type Props = {
  isTitlesLoading: boolean;
  item: AggregatedReferendum<CompletedReferendum>;
  onSelect: (value: AggregatedReferendum<CompletedReferendum>) => void;
};

export const CompletedReferendumItem = memo<Props>(({ item, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();
  const { referendum, title, isVoted } = item;

  const titleNode =
    title ||
    (isTitlesLoading ? (
      <Shimmering height={20} width={200} />
    ) : (
      t('governance.referendums.referendumTitle', { index: referendum.referendumId })
    ));

  return (
    <ListItem onClick={() => onSelect(item)}>
      <div className="flex items-center gap-x-2 w-full">
        <Voted active={isVoted} />
        <VotingStatusBadge referendum={referendum} />
        <FootnoteText className="ml-auto text-text-secondary">#{referendum.referendumId}</FootnoteText>
      </div>
      <HeadlineText>{titleNode}</HeadlineText>
    </ListItem>
  );
});
