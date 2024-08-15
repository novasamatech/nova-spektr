import { memo } from 'react';

import { useI18n } from '@app/providers';
import { type OngoingReferendum } from '@shared/core';
import { HeadlineText, Shimmering } from '@shared/ui';
import { TrackInfo, VoteChart, Voted, votingService } from '@entities/governance';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { ListItem } from './ListItem';
import { VotedBy } from './VotedBy';

type Props = {
  isTitlesLoading: boolean;
  referendum: AggregatedReferendum<OngoingReferendum>;
  onSelect: (value: AggregatedReferendum<OngoingReferendum>) => void;
};

export const OngoingReferendumItem = memo<Props>(({ referendum, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();
  const { supportThreshold, approvalThreshold, isVoted, title, votedByDelegate } = referendum;
  const isPassing = supportThreshold ? supportThreshold.passing : false;
  const voteFractions = approvalThreshold
    ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
    : null;

  const titleNode =
    title ||
    (isTitlesLoading ? (
      <Shimmering height={20} width={200} />
    ) : (
      t('governance.referendums.referendumTitle', { index: referendum.referendumId })
    ));

  return (
    <ListItem onClick={() => onSelect(referendum)}>
      <div className="flex w-full items-center gap-x-2">
        <Voted active={isVoted} />
        <VotedBy address={votedByDelegate} />
        <VotingStatusBadge passing={isPassing} referendum={referendum} />

        {/*<ReferendumTimer status="reject" time={600000} />*/}
        <TrackInfo referendumId={referendum.referendumId} trackId={referendum.track} />
      </div>
      <div className="flex w-full items-start gap-x-6">
        <HeadlineText className="pointer-events-auto flex-1">{titleNode}</HeadlineText>
        <div className="shrink-0 basis-[200px]">
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
