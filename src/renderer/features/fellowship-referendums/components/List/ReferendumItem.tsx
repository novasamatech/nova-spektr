import { memo } from 'react';

import { useI18n } from '@app/providers';
import { FootnoteText, HeadlineText } from '@shared/ui';
import { Box, Skeleton, Surface } from '@shared/ui-kit';
import { type Referendum, collectiveDomain } from '@/domains/collectives';

import { TrackInfo } from './TrackInfo';

type Props = {
  isTitlesLoading: boolean;
  referendum: Referendum;
  onSelect: (value: Referendum) => void;
};

export const ReferendumItem = memo<Props>(({ referendum, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();
  const { id } = referendum;
  const title = '';
  // const isPassing = supportThreshold ? supportThreshold.passing : false;
  // const voteFractions =
  //   referendumService.isOngoing(referendum) && approvalThreshold
  //     ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
  //     : null;

  const titleNode = (
    <Skeleton active={isTitlesLoading && !title}>
      {title || t('governance.referendums.referendumTitle', { index: id })}
    </Skeleton>
  );

  return (
    <Surface onClick={() => onSelect(referendum)}>
      <Box gap={1} padding={3}>
        <div className="flex w-full items-center gap-x-2">
          {/*<Voted active={nonNullable(referendum.vote)} />*/}
          {/*<VotedBy address={referendum.votedByDelegate} />*/}
          {/*<VotingStatusBadge passing={isPassing} referendum={referendum} />*/}

          {/*<ReferendumTimer status="reject" time={600000} />*/}
          <div className="ml-auto flex text-text-secondary">
            <FootnoteText className="text-inherit">#{id}</FootnoteText>
            {collectiveDomain.referendum.service.isOngoing(referendum) && <TrackInfo track={referendum.track} />}
          </div>
        </div>
        <div className="flex w-full items-start gap-x-6">
          <HeadlineText className="pointer-events-auto flex-1">{titleNode}</HeadlineText>
          {/*<div className="shrink-0 basis-[200px]">*/}
          {/*  {voteFractions ? (*/}
          {/*    <ReferendumVoteChart aye={voteFractions.aye} nay={voteFractions.nay} pass={voteFractions.pass} />*/}
          {/*  ) : null}*/}
          {/*</div>*/}
        </div>
      </Box>
    </Surface>
  );
});
