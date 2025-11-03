import { type PropsWithChildren, memo, useMemo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, trackService, useTracks } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { useEvidenceContent } from '../hooks/useEvidenceContent';
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

  const api = useFellowshipApi();
  const { data: tracks } = useTracks({ palletType: 'fellowship', api });
  const { data: evidence } = useEvidenceContent(referendum);

  const modalTitle = useMemo(() => {
    if (title) {
      return title;
    }

    if (referendum && referendumService.isOngoing(referendum)) {
      if (trackService.isPromotionTrack(referendum.track) || trackService.isRetentionTrack(referendum.track)) {
        const rankTitle = detailsService.getRankTitle(referendum.track, tracks);
        if (rankTitle) {
          return rankTitle;
        }
      }
    }

    return t('governance.referendums.referendumTitle', { index: referendum.id });
  }, [title, referendum, tracks, referendum.id]);

  return (
    <Modal size="xl" height="fit">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{modalTitle}</Modal.Title>
      <Modal.Content>
        <div className="flex h-full bg-main-app-background">
          <Box direction="row" width="100%" height="100%" gap={4} padding={[4, 6]} fillContainer>
            <Box width="100%" height="100%" gap={4}>
              <ReferendumDescription referendum={referendum} />
            </Box>
            <Box width="350px" shrink={0} gap={4}>
              <Slot id={referendumAdditionalHighPriorityInfoSlot} props={{ referendumId: referendum.id }} />

              <MemberProfile referendum={referendum} evidence={evidence} />

              <Slot id={referendumAdditionalInfoSlot} props={{ referendum }} />

              <Slot id={referendumActionsSlot} props={{ referendum, evidence }} />

              <AdditionalInfo referendumId={referendum.id} evidenceHash={evidence?.hash} />
            </Box>
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
});
