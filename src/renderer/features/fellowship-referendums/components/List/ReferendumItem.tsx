import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@app/providers';
import { FootnoteText, HeadlineText } from '@shared/ui';
import { Box, Skeleton, Surface } from '@shared/ui-kit';
import { type Referendum, collectiveDomain } from '@/domains/collectives';
import { thresholdsModel } from '../../model/thresholds';

import { ReferendumVoteChart } from './ReferendumVoteChart';
import { TrackInfo } from './TrackInfo';
import { VotingStatusBadge } from './VotingStatusBadge';

type Props = {
  isTitlesLoading: boolean;
  referendum: Referendum;
  onSelect: (value: Referendum) => void;
};

export const ReferendumItem = memo<Props>(({ referendum, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();
  const title = '';

  const thresholds = useStoreMap({
    store: thresholdsModel.$thresholds,
    keys: [referendum.id],
    fn: (thresholds, [id]) => thresholds[id] ?? null,
  });
  const isPassing = thresholds ? thresholds.support.passing : false;
  // const voteFractions =
  //   referendumService.isOngoing(referendum) && approvalThreshold
  //     ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
  //     : null;

  const titleNode = (
    <Skeleton active={isTitlesLoading && !title}>
      {title || t('governance.referendums.referendumTitle', { index: referendum.id })}
    </Skeleton>
  );

  return (
    <Surface onClick={() => onSelect(referendum)}>
      <Box gap={3} padding={[4, 3]}>
        <Box direction="row" verticalAlign="center" gap={2}>
          {/*<Voted active={nonNullable(referendum.vote)} />*/}
          {/*<VotedBy address={referendum.votedByDelegate} />*/}
          <VotingStatusBadge passing={isPassing} referendum={referendum} />

          {/*<ReferendumTimer status="reject" time={600000} />*/}
          <div className="ml-auto flex text-text-secondary">
            <FootnoteText className="text-inherit">#{referendum.id}</FootnoteText>
            {collectiveDomain.referendum.service.isOngoing(referendum) && <TrackInfo track={referendum.track} />}
          </div>
        </Box>
        <Box direction="row" horizontalAlign="flex-start" gap={6}>
          <HeadlineText className="pointer-events-auto flex-1">{titleNode}</HeadlineText>
          <Box width="200px">
            <ReferendumVoteChart referendum={referendum} />
          </Box>
        </Box>
      </Box>
    </Surface>
  );
});
