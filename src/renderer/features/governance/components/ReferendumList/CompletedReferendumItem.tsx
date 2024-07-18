import { memo } from 'react';

import { useI18n } from '@app/providers';
import { type CompletedReferendum } from '@shared/core';
import { FootnoteText, HeadlineText, Shimmering } from '@shared/ui';
import { Voted } from '@entities/governance';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { ListItem } from './ListItem';

type Props = {
  isTitlesLoading: boolean;
  referendum: AggregatedReferendum<CompletedReferendum>;
  onSelect: (value: AggregatedReferendum<CompletedReferendum>) => void;
};

export const CompletedReferendumItem = memo<Props>(({ referendum, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();

  const titleNode =
    referendum.title ||
    (isTitlesLoading ? (
      <Shimmering height={20} width={200} />
    ) : (
      t('governance.referendums.referendumTitle', { index: referendum.referendumId })
    ));

  return (
    <ListItem onClick={() => onSelect(referendum)}>
      <div className="flex items-center gap-x-2 w-full">
        <Voted active={referendum.isVoted} />
        <VotingStatusBadge referendum={referendum} />
        <FootnoteText className="ml-auto text-text-secondary">#{referendum.referendumId}</FootnoteText>
      </div>
      <HeadlineText>{titleNode}</HeadlineText>
    </ListItem>
  );
});
