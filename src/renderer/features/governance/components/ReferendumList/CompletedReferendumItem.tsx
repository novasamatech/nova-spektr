import { memo } from 'react';

import { useI18n } from '@app/providers';
import { Voted } from '@entities/governance';
import { FootnoteText, HeadlineText } from '@shared/ui';
import { CompletedReferendum } from '@shared/core';
import { AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';
import { ListItem } from './ListItem';

type Props = {
  item: AggregatedReferendum<CompletedReferendum>;
  onSelect: (value: CompletedReferendum) => void;
};

export const CompletedReferendumItem = memo<Props>(({ item, onSelect }) => {
  const { t } = useI18n();
  const { referendum, title, isVoted } = item;

  return (
    <ListItem onClick={() => onSelect(referendum)}>
      <div className="flex items-center gap-x-2 w-full">
        <Voted active={isVoted} />
        <VotingStatusBadge referendum={referendum} />
        <FootnoteText className="ml-auto text-text-secondary">#{referendum.referendumId}</FootnoteText>
      </div>
      <HeadlineText>
        {title || t('governance.referendums.referendumTitle', { index: referendum.referendumId })}
      </HeadlineText>
    </ListItem>
  );
});
