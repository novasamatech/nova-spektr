import { useUnit } from 'effector-react';
import { type PropsWithChildren, memo, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { SmallTitleText } from '@/shared/ui';
import { CollectiveReferendumVoteChart } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { type Referendum, referendumService, trackService } from '@/domains/collectives';
import { details } from '../model/details';
import { tracksModel } from '../model/tracks';
import { detailsService } from '../service';

import { Card } from './Card';
import { MemberProfile } from './MemberProfile';
import { ReferendumDescription } from './ReferendumDescription';
import { ReferendumVotingStatusBadge } from './ReferendumVotingStatusBadge';
import { Threshold } from './Threshold';

export const referendumAdditionalHighPriorityInfoSlot = createSlot<{ referendumId: ReferendumId }>();
export const referendumAdditionalLowPriorityInfoSlot = createSlot<{ referendumId: ReferendumId }>();

export const referendumActionsSlot = createSlot<{
  referendumId: ReferendumId;
  onHighlight: (value: 'Aye' | 'Nay' | null) => void;
}>();

type Props = PropsWithChildren<{
  referendum: Referendum;
}>;

export const ReferendumDetailsModal = memo(({ referendum, children }: Props) => {
  const { t } = useI18n();

  const [highlight, setHighlight] = useState<'Aye' | 'Nay' | null>(null);

  const tracks = useUnit(tracksModel.$list);
  const pendingReferendum = useUnit(details.$pending);

  const totalReferendumVotes =
    referendum && referendumService.isOngoing(referendum) ? referendum.tally.ayes + referendum.tally.nays : null;

  const loadingState = pendingReferendum && nullable(referendum);

  const referendumId = referendum?.id;

  let title = t('governance.referendums.referendumTitle', { index: referendumId });
  if (referendum && referendumService.isOngoing(referendum)) {
    if (trackService.isPromotionTrack(referendum.track) || trackService.isRetentionTrack(referendum.track)) {
      title = detailsService.getRankTitle(referendum.track, tracks) || title;
    }
  }

  return (
    <Modal size="xl" height="full">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content disableScroll>
        <div className="flex h-full bg-main-app-background">
          <ScrollArea>
            <Box direction="row" width="100%" gap={4} padding={[4, 6]} fillContainer>
              <Box width="100%" gap={4}>
                <ReferendumDescription referendum={referendum} />
              </Box>
              <Box width="350px" shrink={0} gap={4}>
                <Slot id={referendumAdditionalHighPriorityInfoSlot} props={{ referendumId }} />
                <Card>
                  <Box padding={6} gap={6}>
                    <SmallTitleText>{t('fellowship.voting.votingStatus')}</SmallTitleText>
                    <ReferendumVotingStatusBadge referendum={referendum} pending={loadingState} />
                    <CollectiveReferendumVoteChart
                      referendum={referendum}
                      pending={loadingState}
                      votes={totalReferendumVotes}
                      highlight={highlight}
                    />
                    <Threshold referendum={referendum} pending={loadingState} />
                    <Slot id={referendumActionsSlot} props={{ referendumId, onHighlight: setHighlight }} />
                  </Box>
                </Card>

                <MemberProfile referendum={referendum} />

                <Slot id={referendumAdditionalLowPriorityInfoSlot} props={{ referendumId }} />
              </Box>
            </Box>
          </ScrollArea>
        </div>
      </Modal.Content>
    </Modal>
  );
});
