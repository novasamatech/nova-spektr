import { memo } from 'react';

import { useI18n } from '@app/providers';
import { FootnoteText, HeadlineText, Shimmering } from '@shared/ui';
import { TrackInfo, VoteChart, Voted, referendumService, votingService } from '@entities/governance';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { ListItem } from './ListItem';
import { VotedBy } from './VotedBy';

type Props = {
  isTitlesLoading: boolean;
  referendum: AggregatedReferendum;
  onSelect: (value: AggregatedReferendum) => void;
};

export const ReferendumItem = memo<Props>(({ referendum, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();
  const { referendumId, supportThreshold, approvalThreshold } = referendum;
  const isPassing = supportThreshold ? supportThreshold.passing : false;
  const voteFractions =
    referendumService.isOngoing(referendum) && approvalThreshold
      ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
      : null;

  const titleNode =
    referendum.title ||
    (isTitlesLoading ? (
      <Shimmering height="1em" width="28ch" />
    ) : (
      t('governance.referendums.referendumTitle', { index: referendumId })
    ));

  return (
    <ListItem onClick={() => onSelect(referendum)}>
      <div className="flex w-full items-center gap-x-2">
        <Voted active={referendum.isVoted} />
        <VotedBy address={referendum.votedByDelegate} />
        <VotingStatusBadge passing={isPassing} referendum={referendum} />

        {/*<ReferendumTimer status="reject" time={600000} />*/}
        <div className="ml-auto flex text-text-secondary">
          {referendumId && <FootnoteText className="text-inherit">#{referendumId}</FootnoteText>}
          {referendumService.isOngoing(referendum) && <TrackInfo trackId={referendum.track} />}
        </div>
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
