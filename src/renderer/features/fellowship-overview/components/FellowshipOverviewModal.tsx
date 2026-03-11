import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { Modal, Tabs } from '@/shared/ui-kit';
import { FELLOWSHIP_TABS } from '../model/constants';
import { modal } from '../model/modal';

import { CodexTab } from './CodexTab';
import { MembersTab } from './MembersTab';
import { RanksTab } from './RankTab';

export const FellowshipOverviewModal = () => {
  const { t } = useI18n();
  const isOpen = useUnit(modal.$isFellowshipOverviewModalOpen);
  const activeTab = useUnit(modal.$activeTab);
  const closeModal = useUnit(modal.closeFellowshipOverviewModal);
  const features = useUnit($features);

  const handleTabChange = (tab: string) => {
    if (
      tab === FELLOWSHIP_TABS.RANKS ||
      tab === FELLOWSHIP_TABS.MEMBERS ||
      (features.codex && tab === FELLOWSHIP_TABS.CODEX)
    ) {
      modal.switchTab(tab);
    }
  };

  return (
    <Modal isOpen={isOpen} size="xl" height="full" testId={TEST_IDS.FELLOWSHIP.OVERVIEW_MODAL} onToggle={closeModal}>
      <Modal.Title close>{t('fellowship.overview.modalTitle')}</Modal.Title>

      <Modal.Content disableScroll background="secondary">
        <Tabs value={activeTab} onChange={handleTabChange}>
          <div className="relative shrink-0 px-5 pt-5">
            <div className={`absolute top-5 left-5 z-10 ${features.codex ? 'w-[240px]' : 'w-[160px]'}`}>
              <Tabs.List>
                <Tabs.Trigger value="ranks">{t('fellowship.overview.tabs.ranks')}</Tabs.Trigger>
                <Tabs.Trigger value="members">{t('fellowship.overview.tabs.members')}</Tabs.Trigger>
                {features.codex && <Tabs.Trigger value="codex">{t('fellowship.overview.tabs.codex')}</Tabs.Trigger>}
              </Tabs.List>
            </div>
          </div>

          <Tabs.Content value={FELLOWSHIP_TABS.RANKS}>
            <RanksTab />
          </Tabs.Content>
          <Tabs.Content value={FELLOWSHIP_TABS.MEMBERS}>
            <MembersTab />
          </Tabs.Content>
          {features.codex && (
            <Tabs.Content value={FELLOWSHIP_TABS.CODEX}>
              <CodexTab />
            </Tabs.Content>
          )}
        </Tabs>
      </Modal.Content>
    </Modal>
  );
};
