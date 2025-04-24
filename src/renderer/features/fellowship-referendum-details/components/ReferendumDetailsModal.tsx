import { useUnit } from 'effector-react';
import { useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { SmallTitleText } from '@/shared/ui';
import { CollectiveReferendumVoteChart } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { type Track, referendumService, trackService } from '@/domains/collectives';
import { details } from '../model/details';
import { tracksModel } from '../model/tracks';

import { Card } from './Card';
import { ReferendumDescription } from './ReferendumDescription';
import { ReferendumVotingStatusBadge } from './ReferendumVotingStatusBadge';
import { Threshold } from './Threshold';

export const referendumAdditionalHighPriorityInfoSlot = createSlot<{ referendumId: ReferendumId }>();
export const referendumAdditionalLowPriorityInfoSlot = createSlot<{ referendumId: ReferendumId }>();

export const referendumActionsSlot = createSlot<{
  referendumId: ReferendumId;
  onHighlight: (value: 'Aye' | 'Nay' | null) => void;
}>();

const getRankTitle = (rank: number, relatedTrack: Track[] | null | undefined) => {
  const name = relatedTrack?.find(t => t.id === rank)?.name;

  if (!name) return '';

  return name.charAt(0).toUpperCase() + name.slice(1);
};

type Props = {
  isOpen: boolean;
  referendumId: ReferendumId;
  onToggle: (open: boolean) => void;
};

export const ReferendumDetailsModal = ({ referendumId, isOpen, onToggle }: Props) => {
  useFlow(details.flow, { referendumId });

  const { t } = useI18n();

  const [highlight, setHighlight] = useState<'Aye' | 'Nay' | null>(null);

  const referendum = useUnit(details.$referendum);
  const tracks = useUnit(tracksModel.$list);
  const pendingReferendum = useUnit(details.$pending);

  const totalReferendumVotes =
    referendum && referendumService.isOngoing(referendum) ? referendum.tally.ayes + referendum.tally.nays : null;

  const loadingState = pendingReferendum && nullable(referendum);

  let title = t('governance.referendums.referendumTitle', { index: referendumId });
  if (referendum && referendumService.isOngoing(referendum)) {
    if (trackService.isPromotionTrack(referendum.track) || trackService.isRetentionTrack(referendum.track)) {
      title = getRankTitle(referendum.track, tracks) || title;
    }
  }

  return (
    <Modal size="xl" height="full" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content disableScroll>
        <div className="flex h-full bg-main-app-background">
          <ScrollArea>
            <Box direction="row" width="100%" gap={4} padding={[4, 6]} fillContainer>
              <Box width="100%">
                <Card>
                  <ReferendumDescription />
                </Card>
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
                <Slot id={referendumAdditionalLowPriorityInfoSlot} props={{ referendumId }} />
              </Box>
            </Box>
          </ScrollArea>
        </div>
      </Modal.Content>
    </Modal>
  );
};
