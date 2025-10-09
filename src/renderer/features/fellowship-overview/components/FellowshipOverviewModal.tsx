import { useUnit } from 'effector-react';
import { useTranslation } from 'react-i18next';

import { Modal, ScrollArea, Tabs } from '@/shared/ui-kit';
import { type FellowshipTab } from '../model/constants';
import { modal } from '../model/modal';

import { CodexTab } from './CodexTab';
import { MembersTab } from './MembersTab';
import { RanksTab } from './RankTab';

export const FellowshipOverviewModal = () => {
  const { t } = useTranslation();
  const isOpen = useUnit(modal.$isFellowshipOverviewModalOpen);
  const activeTab = useUnit(modal.$activeTab);
  const closeModal = useUnit(modal.closeFellowshipOverviewModal);

  const handleTabChange = (tab: string) => {
    modal.switchTab(tab as FellowshipTab);
  };

  return (
    <Modal isOpen={isOpen} size="xl" height="full" onToggle={closeModal}>
      <Modal.Title close>{t('fellowship.overview.modalTitle')}</Modal.Title>

      <div className="flex h-[54px] shrink-0 items-center justify-between bg-block-background px-4 pt-5">
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Trigger value="ranks">{t('fellowship.overview.tabs.ranks')}</Tabs.Trigger>
            <Tabs.Trigger value="members">{t('fellowship.overview.tabs.members')}</Tabs.Trigger>
            <Tabs.Trigger value="codex">{t('fellowship.overview.tabs.codex')}</Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1 bg-block-background">
        <ScrollArea>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.Content value="ranks">
              <RanksTab />
            </Tabs.Content>
            <Tabs.Content value="members">
              <MembersTab />
            </Tabs.Content>
            <Tabs.Content value="codex">
              <CodexTab />
            </Tabs.Content>
          </Tabs>
        </ScrollArea>
      </div>
    </Modal>
  );
};
