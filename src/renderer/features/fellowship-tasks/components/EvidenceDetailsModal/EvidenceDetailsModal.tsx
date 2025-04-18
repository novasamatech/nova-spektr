import { type PropsWithChildren, memo, useEffect, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { identities } from '../../model/identity';

import { Content } from './Content';
import { MemberInfo } from './MemberInfo';
import { MemberProfile } from './MemberProfile';
import { VotingRecord } from './VotingRecord';

export const evidenceActionsSlot = createSlot<{ evidence: Evidence }>();

type Props = PropsWithChildren<{
  evidence: Evidence;
}>;

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
        <div className="grid h-full grid-cols-[293px,1fr] bg-main-app-background ps-5">
          <Box gap={4} padding={[5, 0]} shrink={0}>
            <MemberProfile evidence={evidence} />
            <VotingRecord evidence={evidence} />
            <MemberInfo evidence={evidence} />
          </Box>
          <Box padding={5}>
            <Content evidence={evidence} />
          </Box>
        </div>
      </Modal.Content>
      <Modal.Footer align="between">
        <Button variant="text" onClick={() => setOpen(false)}>
          {t('general.button.closeButton')}
        </Button>
        <Box direction="row" gap={2}>
          <Slot id={evidenceActionsSlot} props={{ evidence }} />
        </Box>
      </Modal.Footer>
    </Modal>
  );
});
