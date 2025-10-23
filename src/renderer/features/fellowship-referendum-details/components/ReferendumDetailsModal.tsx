import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type PropsWithChildren, memo, useMemo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, trackService } from '@/domains/collectives';
import { details } from '../model/details';
import { fellowshipReferendumsDetailsFeature } from '../model/feature';
import { fellowship } from '../model/fellowship';
import { tracksModel } from '../model/tracks';
import { detailsService } from '../service';

import { AdditionalInfo } from './AdditionalInfo';
import { MemberProfile } from './MemberProfile';
import { ReferendumDescription } from './ReferendumDescription';

export const referendumAdditionalHighPriorityInfoSlot = createSlot<{ referendumId: ReferendumId }>();
export const referendumAdditionalInfoSlot = createSlot<{ referendum: Referendum }>();

export const referendumActionsSlot = createSlot<{ referendum?: Referendum | null; evidence?: Evidence | null }>();

type Props = PropsWithChildren<{
  referendumId: ReferendumId;
  title?: string;
  isCurrentUser?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}>;

export const ReferendumDetailsModal = memo(
  ({ referendumId, children, title, isCurrentUser, isOpen, onClose }: Props) => {
    useGate(fellowshipReferendumsDetailsFeature.gate);

    const { t } = useI18n();

    const tracks = useUnit(tracksModel.$list);
    const evidenceContent = useUnit(details.$evidenceContent);

    const referendum = useStoreMap({
      store: fellowship.$store,
      keys: [referendumId],
      fn: (store, [id]) => store?.referendums?.find(r => r.id === id) ?? null,
    });

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

    const handleToggle = (open: boolean) => {
      if (!open) {
        onClose?.();
      }
    };

    return (
      <Modal size="xl" height="fit" isOpen={isOpen} onToggle={handleToggle}>
        {children && <Modal.Trigger>{children}</Modal.Trigger>}
        <Modal.Title close>{modalTitle}</Modal.Title>
        <Modal.Content>
          <div className="flex h-full bg-main-app-background">
            <Box direction="row" width="100%" height="100%" gap={4} padding={[4, 6]} fillContainer>
              <Box width="100%" height="100%" gap={4}>
                <ReferendumDescription referendum={referendum} />
              </Box>
              <Box width="350px" shrink={0} gap={4}>
                <Slot id={referendumAdditionalHighPriorityInfoSlot} props={{ referendumId }} />

                <MemberProfile referendum={referendum ?? undefined} />

                {referendum && <Slot id={referendumAdditionalInfoSlot} props={{ referendum: referendum }} />}

                {!isCurrentUser && (
                  <Slot id={referendumActionsSlot} props={{ referendum, evidence: evidenceContent }} />
                )}

                <AdditionalInfo referendumId={referendumId} evidenceHash={evidenceContent?.hash} />
              </Box>
            </Box>
          </div>
        </Modal.Content>
      </Modal>
    );
  },
);
