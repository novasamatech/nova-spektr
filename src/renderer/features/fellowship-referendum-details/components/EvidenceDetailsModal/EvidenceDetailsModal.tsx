import { type PropsWithChildren, memo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { SmallTitleText } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { AdditionalInfo } from '../AdditionalInfo';
import { Card } from '../Card';
import { MemberProfile } from '../MemberProfile';

import { Content } from './Content';

type Props = PropsWithChildren<{
  evidence: Evidence;
  title: string;
}>;

export const evidenceActionsSlot = createSlot<{ evidence: Evidence }>();

export const EvidenceDetailsModal = memo(({ evidence, children, title }: Props) => {
  const { t } = useI18n();

  return (
    <Modal size="xl" height="full">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content>
        <div className="grid h-full grid-cols-[1fr,360px] gap-x-4 bg-main-app-background p-6">
          <Box>
            <Content evidence={evidence} />
          </Box>
          <Box gap={4} shrink={0}>
            <MemberProfile evidence={evidence} />

            <Card>
              <Box fillContainer gap={6} padding={6}>
                <SmallTitleText>{t('fellowship.tasks.titles.votingTitle')}</SmallTitleText>
                <Slot id={evidenceActionsSlot} props={{ evidence }} />
              </Box>
            </Card>

            <AdditionalInfo evidenceHash={evidence.hash} />
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
});
