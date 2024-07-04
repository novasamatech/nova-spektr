import { useUnit } from 'effector-react';
import { memo, useDeferredValue } from 'react';

import { useI18n } from '@app/providers';
import { Voted, VoteChart, TrackInfo, votingService, votingModel } from '@entities/governance';
import { Accordion, CaptionText, HeadlineText, Shimmering } from '@shared/ui';
import type { OngoingReferendum } from '@shared/core';
import { AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';
import { ListItemPlaceholder } from './ListItemPlaceholder';
import { ListItem } from './ListItem';

type Props = {
  referendums: AggregatedReferendum<OngoingReferendum>[];
  isLoading: boolean;
  onSelect: (value: OngoingReferendum) => void;
};

const placeholder = Array.from({ length: 4 }, (_, index) => (
  <li key={index}>
    <ListItemPlaceholder />
  </li>
));

export const OngoingReferendums = memo<Props>(({ referendums, isLoading, onSelect }) => {
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
            {t('governance.referendums.ongoing')}
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
          deferredReferendums.map(({ referendum, title, approvalThreshold, supportThreshold }) => {
            const isPassing = supportThreshold ? supportThreshold.passing : false;
            const voteFractions = approvalThreshold
              ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
              : null;

            return (
              <li key={referendum.referendumId}>
                <ListItem onClick={() => onSelect(referendum)}>
                  <div className="flex items-center gap-x-2 w-full">
                    <Voted active={votingService.isReferendumVoted(referendum.referendumId, voting)} />
                    <VotingStatusBadge passing={isPassing} referendum={referendum} />

                    {/*<ReferendumTimer status="reject" time={600000} />*/}
                    <TrackInfo referendumId={referendum.referendumId} trackId={referendum.track} />
                  </div>
                  <div className="flex items-start gap-x-6 w-full">
                    <HeadlineText className="flex-1 pointer-events-auto">
                      {title || t('governance.referendums.referendumTitle', { index: referendum.referendumId })}
                    </HeadlineText>
                    <div className="basis-[200px] shrink-0">
                      {voteFractions ? (
                        <VoteChart
                          bgColor="icon-button"
                          aye={voteFractions.aye}
                          nay={voteFractions.nay}
                          pass={voteFractions.pass}
                        />
                      ) : null}
                    </div>
                  </div>
                </ListItem>
              </li>
            );
          })}
      </Accordion.Content>
    </Accordion>
  );
});
