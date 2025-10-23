import { useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Modal, SearchInput, Tabs } from '@/shared/ui-kit';
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
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: string) => {
    if (tab === FELLOWSHIP_TABS.RANKS || tab === FELLOWSHIP_TABS.MEMBERS || tab === FELLOWSHIP_TABS.CODEX) {
      modal.switchTab(tab);
    }
  };

  return (
    <Modal isOpen={isOpen} size="xl" height="full" onToggle={closeModal}>
      <Modal.Title close>{t('fellowship.overview.modalTitle')}</Modal.Title>

      <div className="flex h-full flex-col bg-block-background">
        <Tabs value={activeTab} onChange={handleTabChange}>
          <div className="flex shrink-0 items-start gap-5 px-5 pt-5">
            <div className="shrink-0">
              <Tabs.List>
                <Tabs.Trigger value="ranks">{t('fellowship.overview.tabs.ranks')}</Tabs.Trigger>
                <Tabs.Trigger value="members">{t('fellowship.overview.tabs.members')}</Tabs.Trigger>
                <Tabs.Trigger value="codex">{t('fellowship.overview.tabs.codex')}</Tabs.Trigger>
              </Tabs.List>
            </div>
            <div className="flex-1 pb-3">
              <Tabs.Content value="members">
                <SearchInput
                  value={searchQuery}
                  placeholder={t('fellowship.overview.searchPlaceholder')}
                  height="sm"
                  width="full"
                  onChange={setSearchQuery}
                />
              </Tabs.Content>
            </div>
          </div>

          <Tabs.Content value={FELLOWSHIP_TABS.RANKS}>
            <RanksTab />
          </Tabs.Content>
          <Tabs.Content value={FELLOWSHIP_TABS.MEMBERS}>
            <MembersTab searchQuery={searchQuery} onClearSearch={() => setSearchQuery('')} />
          </Tabs.Content>
          <Tabs.Content value={FELLOWSHIP_TABS.CODEX}>
            <CodexTab />
          </Tabs.Content>
        </Tabs>
      </div>
    </Modal>
  );
};
