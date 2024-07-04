import { useUnit } from 'effector-react';
import { memo, useDeferredValue } from 'react';

import { useI18n } from '@app/providers';
import { Voted, votingModel, votingService } from '@entities/governance';
import { FootnoteText, Accordion, CaptionText, HeadlineText, Shimmering } from '@shared/ui';
import { CompletedReferendum } from '@shared/core';
import { AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';
import { ListItemPlaceholder } from './ListItemPlaceholder';
import { ListItem } from './ListItem';

type Props = {
  referendums: AggregatedReferendum<CompletedReferendum>[];
  isLoading: boolean;
  onSelect: (value: CompletedReferendum) => void;
};

const placeholder = Array.from({ length: 4 }, (_, index) => (
  <li key={index}>
    <ListItemPlaceholder />
  </li>
));

export const CompletedReferendums = memo<Props>(({ referendums, isLoading, onSelect }) => {
  const { t } = useI18n();
  const voting = useUnit(votingModel.$voting);
  const deferredReferendums = useDeferredValue(referendums);

  if (deferredReferendums.length === 0) {
    return null;
  }

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex items-center gap-x-2 w-full">
          <CaptionText className="uppercase text-text-secondary tracking-[0.75px] font-semibold">
            {t('governance.referendums.completed')}
          </CaptionText>
          {isLoading ? (
            <Shimmering width={25} height={12} />
          ) : (
            <CaptionText className="text-text-tertiary font-semibold">{referendums.length}</CaptionText>
          )}
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {isLoading && placeholder}

        {!isLoading &&
          deferredReferendums.map(({ referendum, title }) => (
            <li key={referendum.referendumId}>
              <ListItem onClick={() => onSelect(referendum)}>
                <div className="flex items-center gap-x-2 w-full">
                  <Voted active={votingService.isReferendumVoted(referendum.referendumId, voting)} />
                  <VotingStatusBadge referendum={referendum} />
                  <FootnoteText className="ml-auto text-text-secondary">#{referendum.referendumId}</FootnoteText>
                </div>
                <HeadlineText>
                  {title || t('governance.referendums.referendumTitle', { index: referendum.referendumId })}
                </HeadlineText>
              </ListItem>
            </li>
          ))}
      </Accordion.Content>
    </Accordion>
  );
});
