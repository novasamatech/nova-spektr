import { useUnit } from 'effector-react';
import { type PropsWithChildren, memo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, trackService } from '@/domains/collectives';
import { details } from '../model/details';
import { tracksModel } from '../model/tracks';
import { detailsService } from '../service';

import { AdditionalInfo } from './AdditionalInfo';
import { MemberProfile } from './MemberProfile';
import { ReferendumDescription } from './ReferendumDescription';

export const referendumAdditionalHighPriorityInfoSlot = createSlot<{ referendumId: ReferendumId }>();
export const referendumAdditionalInfoSlot = createSlot<{ referendum: Referendum }>();

export const referendumActionsSlot = createSlot<{ referendum?: Referendum | null; evidence?: Evidence | null }>();

type Props = PropsWithChildren<{
  referendum: Referendum;
  title?: string;
}>;

export const ReferendumDetailsModal = memo(({ referendum, children, title }: Props) => {
  const { t } = useI18n();

  const tracks = useUnit(tracksModel.$list);
  const evidence = useUnit(details.$evidence);

  const referendumId = referendum?.id;

  let baseTitle = t('governance.referendums.referendumTitle', { index: referendumId });
  if (referendum && referendumService.isOngoing(referendum)) {
    if (trackService.isPromotionTrack(referendum.track) || trackService.isRetentionTrack(referendum.track)) {
      baseTitle = detailsService.getRankTitle(referendum.track, tracks) || baseTitle;
    }
  }

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

                <Slot id={referendumAdditionalInfoSlot} props={{ referendum }} />

                <Slot id={referendumActionsSlot} props={{ referendum, evidence }} />

                <AdditionalInfo referendumId={referendumId} evidenceHash={evidence?.hash} />
              </Box>
            </Box>
          </ScrollArea>
        </div>
      </Modal.Content>
    </Modal>
  );
});
