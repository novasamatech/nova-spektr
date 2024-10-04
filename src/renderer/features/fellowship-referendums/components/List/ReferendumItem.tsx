import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@app/providers';
import { nonNullable } from '@shared/lib/utils';
import { FootnoteText, HeadlineText } from '@shared/ui';
import { Box, Skeleton, Surface } from '@shared/ui-kit';
import { type Referendum, collectiveDomain } from '@/domains/collectives';
import { referendumListModel } from '../../model/list';
import { thresholdsModel } from '../../model/thresholds';
import { ReferendumVoteChart } from '../shared/ReferendumVoteChart';
import { TrackInfo } from '../shared/TrackInfo';

import { VotingStatusBadge } from './VotingStatusBadge';
import { WalletVoted } from './WalletVoted';

type Props = {
  isTitlesLoading: boolean;
  referendum: Referendum;
  onSelect: (value: Referendum) => void;
};

export const ReferendumItem = memo<Props>(({ referendum, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();

  const thresholds = useStoreMap({
    store: thresholdsModel.$thresholds,
    keys: [referendum.id],
    fn: (thresholds, [id]) => thresholds[id] ?? null,
  });

  const meta = useStoreMap({
    store: referendumListModel.$meta,
    keys: [referendum.id],
    fn: (store, [id]) => store[id] ?? null,
  });
  const isPassing = thresholds ? thresholds.support.passing : false;

  const track = collectiveDomain.referendum.service.isOngoing(referendum) ? referendum.track : (meta?.track ?? null);

  const titleNode = (
    <Skeleton active={isTitlesLoading && !meta?.title}>
      {meta?.title || t('governance.referendums.referendumTitle', { index: referendum.id })}
    </Skeleton>
  );

  return (
    <Surface onClick={() => onSelect(referendum)}>
      <Box gap={3} padding={[4, 3]}>
        <Box direction="row" verticalAlign="center" gap={2}>
          <WalletVoted referendum={referendum} />
          {/*<VotedBy address={referendum.votedByDelegate} />*/}
          <VotingStatusBadge passing={isPassing} referendum={referendum} />

          {/*<ReferendumTimer status="reject" time={600000} />*/}
          <div className="ml-auto">
            <Box direction="row" gap={2}>
              <FootnoteText className="text-text-secondary">#{referendum.id}</FootnoteText>
              {nonNullable(track) && <TrackInfo track={track} />}
            </Box>
          </div>
        </Box>
        <Box direction="row" horizontalAlign="flex-start" gap={6}>
          <HeadlineText className="pointer-events-auto flex-1">{titleNode}</HeadlineText>
          <Box width="200px">
            <ReferendumVoteChart referendum={referendum} descriptionPosition="tooltip" />
          </Box>
        </Box>
      </Box>
    </Surface>
  );
});
