/* eslint-disable i18next/no-literal-string */
import { useUnit } from 'effector-react';
import { useState } from 'react';

import { TitleText } from '@/shared/ui/Typography';
import { Modal } from '@/shared/ui-kit';

import { $isFellowshipOverviewModalOpen, closeFellowshipOverviewModal } from '../model/modal';

import { CodexTab } from './CodexTab';
import { MembersFilters, MembersTab } from './MembersTab';
import { RanksTab } from './RanksTab';

export const FellowshipOverviewModal = () => {
  const [isOpen, closeModal] = useUnit([$isFellowshipOverviewModalOpen, closeFellowshipOverviewModal]);
  const [activeTab, setActiveTab] = useState('ranks');

  return (
    <Modal isOpen={isOpen} size="fit" onToggle={closeModal}>
      {/* Fixed width and height container matching Figma: 944px x 736px */}
      <div className="flex h-[736px] w-[944px] flex-col">
        {/* Header - 52px height - FIXED */}
        <div className="flex h-[52px] w-full shrink-0 items-center justify-between py-3 ps-5 pe-3">
          <TitleText className="truncate py-1 font-manrope text-header-title font-bold text-text-primary">
            Fellowship overview
          </TitleText>
          <button
            className="flex size-7 items-center justify-center rounded hover:bg-icon-default/10"
            onClick={() => closeModal()}
          >
            <span className="text-xl text-icon-default">×</span>
          </button>
        </div>

        {/* Tabs control - 34px height - FIXED */}
        <div className="flex h-[34px] shrink-0 items-center justify-between bg-block-background px-5 py-[9px]">
          <div className="flex gap-0.5 rounded-md bg-tab-background p-0.5">
            <button
              className={`font-inter flex h-[26px] cursor-pointer items-center justify-center rounded-sm px-4 py-1.5 text-button-small leading-[18px] font-semibold tracking-[-0.12px] transition-all duration-100 ${
                activeTab === 'ranks'
                  ? 'bg-white text-text-primary shadow-card-shadow'
                  : 'bg-transparent text-text-secondary'
              }`}
              onClick={() => setActiveTab('ranks')}
            >
              Ranks
            </button>
            <button
              className={`font-inter flex h-[26px] cursor-pointer items-center justify-center rounded-sm px-4 py-1.5 text-button-small leading-[18px] font-semibold tracking-[-0.12px] transition-all duration-100 ${
                activeTab === 'members'
                  ? 'bg-white text-text-primary shadow-card-shadow'
                  : 'bg-transparent text-text-secondary'
              }`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
            <button
              className={`font-inter flex h-[26px] cursor-pointer items-center justify-center rounded-sm px-4 py-1.5 text-button-small leading-[18px] font-semibold tracking-[-0.12px] transition-all duration-100 ${
                activeTab === 'codex'
                  ? 'bg-white text-text-primary shadow-card-shadow'
                  : 'bg-transparent text-text-secondary'
              }`}
              onClick={() => setActiveTab('codex')}
            >
              Codex
            </button>
          </div>

          {/* Search and filters - only show on members tab */}
          {activeTab === 'members' && <MembersFilters />}
        </div>

        {/* Content area - SCROLLABLE - Takes remaining height: 736px - 52px - 34px = 650px */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-block-background">
          {activeTab === 'ranks' && <RanksTab />}
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'codex' && <CodexTab />}
        </div>
      </div>
    </Modal>
  );
};
