import { type PropsWithChildren, memo, useState } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { nonNullable } from '@/shared/lib/utils';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence, type Referendum } from '@/domains/collectives';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useEvidenceHash } from '../../hooks/useEvidenceHash';
import { useProposer } from '../../hooks/useProposer';
import { AdditionalInfo } from '../AdditionalInfo';
import { MemberProfile } from '../MemberProfile';

import { Content } from './Content';

type Props = PropsWithChildren<{
  referendum: Referendum | null;
  evidence: Evidence;
  title: string;
  transaction?: Transaction | null;
}>;

export const evidenceActionsSlot = createSlot<{
  evidence: Evidence;
  transaction?: Transaction | null;
  onClose?: () => void;
}>();

export const EvidenceDetailsModal = memo(({ referendum, evidence, children, title, transaction }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const { data: fellowshipMember } = useFellowshipMember();
  const { data: evidenceHash } = useEvidenceHash({ referendum, evidence });
  const { data: proposerMember } = useProposer(referendum, evidence);

  const isCurrentUser =
    nonNullable(fellowshipMember) &&
    nonNullable(proposerMember) &&
    fellowshipMember.accountId === proposerMember.accountId;

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
  };

  const onClose = () => {
    handleToggle(false);
  };

  return (
    <Modal size="xl" height="full" isOpen={isOpen} onToggle={handleToggle}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content>
        <div className="grid h-full grid-cols-[1fr_360px] gap-x-4 bg-main-app-background p-6">
          <Box>
            <Content evidence={evidence} />
          </Box>
          <Box gap={4} shrink={0}>
            <MemberProfile referendum={referendum} evidence={evidence} />
            {!isCurrentUser && <Slot id={evidenceActionsSlot} props={{ evidence, transaction, onClose }} />}
            <AdditionalInfo evidenceHash={evidenceHash} />
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
});
