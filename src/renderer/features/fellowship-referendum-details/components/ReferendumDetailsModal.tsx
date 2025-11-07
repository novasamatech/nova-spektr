import { type PropsWithChildren, memo, useMemo, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, trackService, useTracks } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { useEvidence } from '../hooks/useEvidence';
import { useProposer } from '../hooks/useProposer';
import { useReferendum } from '../hooks/useReferendum';
import { detailsService } from '../service';

import { AdditionalInfo } from './AdditionalInfo';
import { MemberProfile } from './MemberProfile';
import { ReferendumDescription } from './ReferendumDescription';

export const referendumAdditionalHighPriorityInfoSlot = createSlot<{ referendumId: ReferendumId }>();
export const referendumAdditionalInfoSlot = createSlot<{ referendum: Referendum }>();

export const referendumActionsSlot = createSlot<{
  referendum: Referendum | null;
  evidence: Evidence | null;
  onClose?: () => void;
}>();

type Props = PropsWithChildren<{
  referendumId: ReferendumId;
  title?: string;
  isCurrentUser?: boolean;
}>;

export const ReferendumDetailsModal = memo(({ referendumId, children, title, isCurrentUser }: Props) => {
  const { t } = useI18n();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
  };

  const onClose = () => {
    handleToggle(false);
  };

  const api = useFellowshipApi();
  const { data: referendum } = useReferendum(referendumId);
  const { data: proposer } = useProposer(referendum);
  const { data: evidence } = useEvidence(proposer?.accountId ?? null);
  const { data: tracks } = useTracks({ palletType: 'fellowship', api });

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

    return t('governance.referendums.referendumTitle', { index: referendumId });
  }, [title, referendum, tracks, referendumId]);

  return (
    <Modal size="xl" height="fit" isOpen={isOpen} onToggle={handleToggle}>
      {children && <Modal.Trigger>{children}</Modal.Trigger>}
      <Modal.Title close>{modalTitle}</Modal.Title>
      <Modal.Content background="secondary">
        <Box direction="row" width="100%" height="100%" gap={4} padding={[4, 6]} fillContainer>
          <Box width="100%" height="100%" gap={4}>
            <ReferendumDescription referendum={referendum} evidence={evidence} />
          </Box>
          <Box width="350px" shrink={0} gap={4}>
            <Slot id={referendumAdditionalHighPriorityInfoSlot} props={{ referendumId }} />

            <MemberProfile referendum={referendum} evidence={evidence} />

            {referendum && <Slot id={referendumAdditionalInfoSlot} props={{ referendum: referendum }} />}

            {!isCurrentUser && <Slot id={referendumActionsSlot} props={{ referendum, evidence, onClose }} />}

            <AdditionalInfo referendumId={referendumId} evidenceHash={evidence?.hash} />
          </Box>
        </Box>
      </Modal.Content>
    </Modal>
  );
});
