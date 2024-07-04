import { useUnit } from 'effector-react';
import { memo, useDeferredValue } from 'react';

import { useI18n } from '@app/providers';
import { Voted, governanceModel, votingService } from '@entities/governance';
import { FootnoteText, Accordion, CaptionText, HeadlineText } from '@shared/ui';
import { CompletedReferendum } from '@shared/core';
import { networkSelectorModel } from '../../../model/network-selector-model';
import { VotingStatusBadge } from '../../VotingStatusBadge';
import { referendumListModel } from '../model/referendum-list-model';
import { ListItem } from './ListItem';

type Props = {
  referendums: CompletedReferendum[];
  onSelect: (value: CompletedReferendum) => void;
};

export const CompletedReferendums = memo<Props>(({ referendums, onSelect }) => {
  const { t } = useI18n();

  const chain = useUnit(networkSelectorModel.$governanceChain);
  const voting = useUnit(governanceModel.$voting);
  const titles = useUnit(referendumListModel.$referendumTitles);

  const deferredReferendums = useDeferredValue(referendums);

  if (!chain || deferredReferendums.length === 0) {
    return null;
  }

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex items-center gap-x-2 w-full">
          <CaptionText className="uppercase text-text-secondary tracking-[0.75px] font-semibold">
            {t('governance.referendums.completed')}
          </CaptionText>
          <CaptionText className="text-text-tertiary font-semibold">{Object.keys(referendums).length}</CaptionText>
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {deferredReferendums.map((referendum) => (
          <li key={referendum.referendumId}>
            <ListItem onClick={() => onSelect(referendum)}>
              <div className="flex items-center gap-x-2 w-full">
                <Voted active={votingService.isReferendumVoted(referendum.referendumId, voting)} />
                <VotingStatusBadge referendum={referendum} />
                <FootnoteText className="ml-auto text-text-secondary">#{referendum.referendumId}</FootnoteText>
              </div>
              <HeadlineText>
                {titles[referendum.referendumId] ||
                  t('governance.referendums.referendumTitle', { index: referendum.referendumId })}
              </HeadlineText>
            </ListItem>
          </li>
        ))}
      </Accordion.Content>
    </Accordion>
  );
});
