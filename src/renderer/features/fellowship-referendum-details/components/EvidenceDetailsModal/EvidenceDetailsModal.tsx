import { type PropsWithChildren, memo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { Card } from '../Card';
import { MemberProfile } from '../MemberProfile';

import { Content } from './Content';

type Props = PropsWithChildren<{
  evidence: Evidence;
}>;

export const evidenceActionsSlot = createSlot<{ evidence: Evidence }>();

export const EvidenceDetailsModal = memo(({ evidence, children }: Props) => {
  const { t } = useI18n();

  const isPromotion = evidence.wish === 'Promotion';
  const isRetention = evidence.wish === 'Retention';

  let title = '';
  if (isPromotion) {
    title = t('fellowship.evidenceModal.titlePromotion');
  }
  if (isRetention) {
    title = t('fellowship.evidenceModal.titleRetention');
  }

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
              <Box direction="row" gap={2} padding={6}>
                <Slot id={evidenceActionsSlot} props={{ evidence }} />
              </Box>
            </Card>
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
});
