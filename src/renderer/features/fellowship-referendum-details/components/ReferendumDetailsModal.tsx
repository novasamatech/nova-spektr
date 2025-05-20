import { useUnit } from 'effector-react';
import { type PropsWithChildren, memo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { SmallTitleText } from '@/shared/ui';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, trackService } from '@/domains/collectives';
import { tracksModel } from '../model/tracks';
import { detailsService } from '../service';

import { AdditionalInfo } from './AdditionalInfo';
import { Card } from './Card';
import { MemberProfile } from './MemberProfile';
import { ReferendumDescription } from './ReferendumDescription';

export const referendumAdditionalHighPriorityInfoSlot = createSlot<{ referendumId: ReferendumId }>();
export const referendumAdditionalInfoSlot = createSlot<{ referendumId: ReferendumId }>();

export const referendumActionsSlot = createSlot<{ referendum?: Referendum | null; evidence?: Evidence | null }>();

type Props = PropsWithChildren<{
  referendum: Referendum;
  title?: string;
}>;

export const ReferendumDetailsModal = memo(({ referendum, children, title }: Props) => {
  const { t } = useI18n();

  const tracks = useUnit(tracksModel.$list);

  const referendumId = referendum?.id;

  let baseTitle = t('governance.referendums.referendumTitle', { index: referendumId });
  if (referendum && referendumService.isOngoing(referendum)) {
    if (trackService.isPromotionTrack(referendum.track) || trackService.isRetentionTrack(referendum.track)) {
      baseTitle = detailsService.getRankTitle(referendum.track, tracks) || baseTitle;
    }
  }

  //todo move this title inside the slot
  const slotTitle = t('fellowship.tasks.titles.votingTitle');

  return (
    <Modal size="xl" height="full">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{title || baseTitle}</Modal.Title>
      <Modal.Content disableScroll>
        <div className="flex h-full bg-main-app-background">
          <ScrollArea>
            <Box direction="row" width="100%" gap={4} padding={[4, 6]} fillContainer>
              <Box width="100%" gap={4}>
                <ReferendumDescription referendum={referendum} />
              </Box>
              <Box width="350px" shrink={0} gap={4}>
                <Slot id={referendumAdditionalHighPriorityInfoSlot} props={{ referendumId }} />

                <MemberProfile referendum={referendum} />

                <Slot id={referendumAdditionalInfoSlot} props={{ referendumId }} />

                <Card>
                  <Box padding={6} gap={6}>
                    <SmallTitleText>{slotTitle}</SmallTitleText>
                    <Slot id={referendumActionsSlot} props={{ referendum }} />
                  </Box>
                </Card>

                <AdditionalInfo referendumId={referendumId} />
              </Box>
            </Box>
          </ScrollArea>
        </div>
      </Modal.Content>
    </Modal>
  );
});
