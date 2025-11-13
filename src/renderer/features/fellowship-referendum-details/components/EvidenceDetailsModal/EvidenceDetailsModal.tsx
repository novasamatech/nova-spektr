import { type PropsWithChildren, memo, useState } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { AdditionalInfo } from '../AdditionalInfo';
import { MemberProfile } from '../MemberProfile';

import { Content } from './Content';

type Props = PropsWithChildren<{
  evidence: Evidence;
  title: string;
  transaction?: Transaction | null;
}>;

export const evidenceActionsSlot = createSlot<{
  evidence: Evidence;
  transaction?: Transaction | null;
  onClose?: () => void;
}>();

export const EvidenceDetailsModal = memo(({ evidence, children, title, transaction }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

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
            <MemberProfile evidence={evidence} />

            <Slot id={evidenceActionsSlot} props={{ evidence, transaction, onClose }} />

            <AdditionalInfo evidenceHash={evidence.hash} />
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
});
