import { useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Box, Modal, Tabs } from '@/shared/ui-kit';
import { fellowshipSalaryFeature } from '../model/feature';
import { profile } from '../model/profile';

import { EvidenceInfo } from './EvidenceInfo';
import { SalaryInfo } from './SalaryInfo';

export const EvidenceSalaryModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();
  const featureInput = useUnit(fellowshipSalaryFeature.input);
  const currentMember = useUnit(profile.$member);
  const [tab, setTab] = useState('evidence');

  const disabled = nullable(currentMember) || nullable(featureInput);

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
            <EvidenceInfo />
          </Tabs.Content>
          <Tabs.Content value="salary">
            <SalaryInfo />
          </Tabs.Content>
        </Tabs>
      </Modal.Content>
    </Modal>
  );
};
