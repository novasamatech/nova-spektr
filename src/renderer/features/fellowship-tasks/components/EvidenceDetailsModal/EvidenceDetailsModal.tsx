import { type PropsWithChildren, memo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, Markdown } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';

import { Card } from './Card';
import { MemberInfo } from './MemberInfo';
import { MemberProfile } from './MemberProfile';
import { VotingRecord } from './VotingRecord';

type Props = PropsWithChildren<{
  evidence: Evidence;
}>;

export const EvidenceDetailsModal = memo(({ evidence, children }: Props) => {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);

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
            <Card>
              <Markdown>{evidence.content}</Markdown>
            </Card>
          </Box>
        </div>
      </Modal.Content>
      <Modal.Footer align="between">
        <Button variant="text" onClick={() => setOpen(false)}>
          {t('general.button.closeButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});
