import { type PropsWithChildren, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Box, Modal, Tabs } from '@/shared/ui-kit';
import { useFellowshipMember } from '@/aggregates/fellowship-member';

export const evidenceSlot = createSlot();
export const salarySlot = createSlot();

export const EvidenceSalaryModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();
  const [tab, setTab] = useState('evidence');

  const { data: currentMember } = useFellowshipMember();

  const disabled = nullable(currentMember);

  if (disabled) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
  }

  return (
    <Modal size="md" height="fit">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.salary.modalTitle')}</Modal.Title>
      <Modal.Content disableScroll>
        <Tabs value={tab} onChange={setTab}>
          <Box padding={[0, 5]}>
            <Tabs.List>
              <Tabs.Trigger value="evidence">{t('fellowship.salary.evidence')}</Tabs.Trigger>
              <Tabs.Trigger value="salary">{t('fellowship.salary.salary')}</Tabs.Trigger>
            </Tabs.List>
          </Box>
          <Tabs.Content value="evidence">
            <Slot id={evidenceSlot} />
          </Tabs.Content>
          <Tabs.Content value="salary">
            <Slot id={salarySlot} />
          </Tabs.Content>
        </Tabs>
      </Modal.Content>
    </Modal>
  );
};
