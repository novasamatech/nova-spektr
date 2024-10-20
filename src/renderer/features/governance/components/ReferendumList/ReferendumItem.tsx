import { type ApiPromise } from '@polkadot/api';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, HeadlineText, Shimmering } from '@/shared/ui';
import { ReferendumVoteChart, TrackInfo, Voted, referendumService, votingService } from '@/entities/governance';
import { type AggregatedReferendum } from '../../types/structs';
import { ReferendumEndTimer } from '../ReferendumEndTimer/ReferendumEndTimer';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { ListItem } from './ListItem';
import { VotedBy } from './VotedBy';

type Props = {
  isTitlesLoading: boolean;
  referendum: AggregatedReferendum;
  api: ApiPromise;
  onSelect: (value: AggregatedReferendum) => void;
};

export const ReferendumItem = memo(({ referendum, isTitlesLoading, api, onSelect }: Props) => {
  const { t } = useI18n();

  const { referendumId, approvalThreshold } = referendum;

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
        <Voted active={referendum.voting.votes.length > 0} />
        <VotedBy address={referendum.votedByDelegate} />
        <VotingStatusBadge referendum={referendum} />

        <ReferendumEndTimer status={referendum.status} endBlock={referendum.end} api={api} />

        <div className="ml-auto flex text-text-secondary">
          {referendumId && <FootnoteText className="text-inherit">#{referendumId}</FootnoteText>}
          {referendumService.isOngoing(referendum) && <TrackInfo trackId={referendum.track} />}
        </div>
      </div>
      <div className="flex w-full items-start gap-x-6">
        <HeadlineText className="pointer-events-auto flex-1">{titleNode}</HeadlineText>
        <div className="shrink-0 basis-[200px]">
          {voteFractions ? (
            <ReferendumVoteChart aye={voteFractions.aye} nay={voteFractions.nay} pass={voteFractions.pass} />
          ) : null}
        </div>
      </div>
    </ListItem>
  );
});
