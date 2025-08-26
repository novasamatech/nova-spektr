import { type PropsWithChildren, memo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { AdditionalInfo } from '../AdditionalInfo';
import { MemberProfile } from '../MemberProfile';

import { Content } from './Content';

type Props = PropsWithChildren<{
  evidence: Evidence;
  title: string;
}>;

export const evidenceActionsSlot = createSlot<{ evidence: Evidence }>();

export const EvidenceDetailsModal = memo(({ evidence, children, title }: Props) => {
  return (
    <Modal size="xl" height="full">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content>
        <div className="grid h-full grid-cols-[1fr_360px] gap-x-4 bg-main-app-background p-6">
          <Box>
            <Content evidence={evidence} />
          </Box>
          <Box gap={4} shrink={0}>
            <MemberProfile evidence={evidence} />

            <Slot id={evidenceActionsSlot} props={{ evidence }} />

            <AdditionalInfo evidenceHash={evidence.hash} />
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
});
