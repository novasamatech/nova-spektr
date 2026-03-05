import { type PropsWithChildren, memo, useMemo, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toAddress, toRomanNumeral, toShortAddress } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, trackService } from '@/domains/collectives';
import { useFellowshipChain, useFellowshipIdentity } from '@/aggregates/fellowship-network';
import { useEvidence } from '../hooks/useEvidence';
import { useEvidenceHash } from '../hooks/useEvidenceHash';
import { useProposer } from '../hooks/useProposer';
import { useReferendum } from '../hooks/useReferendum';

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

  const chain = useFellowshipChain();
  const { data: referendum } = useReferendum(referendumId);
  const { data: proposer } = useProposer(referendum);
  const { data: evidence } = useEvidence(proposer?.accountId ?? null);
  const { data: evidenceHash } = useEvidenceHash({ referendum, evidence });
  const { data: identity } = useFellowshipIdentity(proposer?.accountId ?? null);

  const modalTitle = useMemo(() => {
    if (title) {
      return title;
    }

    if (referendum && referendumService.isOngoing(referendum) && proposer) {
      const isPromotionTrack = trackService.isPromotionTrack(referendum.track);
      const isRetentionTrack = trackService.isRetentionTrack(referendum.track);

      if (isPromotionTrack || isRetentionTrack) {
        const rank = trackService.getRankFromTrackId(referendum.track);

        if (rank > 0) {
          const template = isPromotionTrack ? 'fellowship.tasks.titles.promote' : 'fellowship.tasks.titles.retain';
          const name =
            identity?.name ?? toShortAddress(toAddress(proposer.accountId, { prefix: chain?.addressPrefix }), 5);

          return t(template, {
            name,
            rank: toRomanNumeral(rank),
          });
        }
      }
    }

    return t('governance.referendums.referendumTitle', { index: referendumId });
  }, [title, referendum, proposer, identity, chain, t, referendumId]);

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
  };

  const onClose = () => {
    handleToggle(false);
  };

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

            <AdditionalInfo referendumId={referendumId} evidenceHash={evidenceHash} />
          </Box>
        </Box>
      </Modal.Content>
    </Modal>
  );
});
