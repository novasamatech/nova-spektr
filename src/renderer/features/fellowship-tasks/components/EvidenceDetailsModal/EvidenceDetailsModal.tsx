import { type PropsWithChildren, memo, useEffect, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { identities } from '../../model/identity';

import { Card } from './Card';
import { Content } from './Content';
import { MemberProfile } from './MemberProfile';

type Props = PropsWithChildren<{
  evidence: Evidence;
}>;

export const evidenceActionsSlot = createSlot<{ evidence: Evidence }>();

export const EvidenceDetailsModal = memo(({ evidence, children }: Props) => {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    identities.request({ accountId: evidence.accountId });
  }, [evidence.accountId]);

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
    <Modal size="xl" height="full" isOpen={open} onToggle={setOpen}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title>{title}</Modal.Title>
      <Modal.Content>
        <div className="grid h-full grid-cols-[1fr,360px] gap-x-4 bg-main-app-background p-6">
          <Box>
            <Content evidence={evidence} />
          </Box>
          <Box gap={4} shrink={0}>
            <MemberProfile evidence={evidence} />

            <Card>
              <Box direction="row" gap={2}>
                <Slot id={evidenceActionsSlot} props={{ evidence }} />
              </Box>
            </Card>
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
});
