import { memo } from 'react';

import { useI18n } from '@app/providers';
import { Voted, VoteChart, TrackInfo, votingService } from '@entities/governance';
import { HeadlineText } from '@shared/ui';
import type { OngoingReferendum } from '@shared/core';
import { AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';
import { ListItem } from './ListItem';

type Props = {
  item: AggregatedReferendum<OngoingReferendum>;
  onSelect: (value: OngoingReferendum) => void;
};

export const OngoingReferendumItem = memo<Props>(({ item, onSelect }) => {
  const { t } = useI18n();
  const { referendum, supportThreshold, approvalThreshold, isVoted, title } = item;
  const isPassing = supportThreshold ? supportThreshold.passing : false;
  const voteFractions = approvalThreshold
    ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
    : null;

  return (
    <ListItem onClick={() => onSelect(referendum)}>
      <div className="flex items-center gap-x-2 w-full">
        <Voted active={isVoted} />
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
  );
});
