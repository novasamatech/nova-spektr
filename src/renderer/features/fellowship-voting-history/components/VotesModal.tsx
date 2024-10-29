import { useGate, useUnit } from 'effector-react';
import orderBy from 'lodash/orderBy';
import { type PropsWithChildren, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon, Tabs } from '@/shared/ui';
import { type TabItem } from '@/shared/ui/types';
import { Box, Modal } from '@/shared/ui-kit';
import { votingHistoryFeatureStatus } from '../model/status';
import { votesModel } from '../model/votes';

import { VotingHistoryList } from './VotingHistoryList';

export const VotesModal = ({ children }: PropsWithChildren) => {
  useGate(votingHistoryFeatureStatus.gate);

  const { t } = useI18n();
  const [selectedTab, setSelectedTab] = useState(0);

  const votes = useUnit(votesModel.$votesList);
  const input = useUnit(votingHistoryFeatureStatus.input);
  const isLoading = useUnit(votesModel.$pending);

  const chain = input?.chain ?? null;

  const ayes = orderBy(
    votes.filter(vote => vote.decision === 'Aye'),
    'votes',
    'desc',
  );

  const nays = orderBy(
    votes.filter(vote => vote.decision === 'Nay'),
    'votes',
    'desc',
  );

  const tabs: TabItem[] = [
    {
      id: 'ayes',
      title: (
        <span className="flex items-center gap-1">
          <Icon name="thumbUp" size={16} className={cnTw(selectedTab === 0 && 'text-icon-positive')} />
          <span>{t('governance.referendum.ayes')}</span>
          <FootnoteText as="span" className="text-text-tertiary">
            {ayes.length.toString()}
          </FootnoteText>
        </span>
      ),
      panel: <VotingHistoryList chain={chain} items={ayes} loading={isLoading} />,
    },
    {
      id: 'nays',
      title: (
        <span className="flex items-center gap-1">
          <Icon name="thumbDown" size={16} className={cnTw(selectedTab === 1 && 'text-icon-negative')} />
          <span>{t('governance.referendum.nays')}</span>
          {nays.length.toString()}
        </span>
      ),
      panel: <VotingHistoryList chain={chain} items={nays} loading={isLoading} />,
    },
  ];

  return (
    <Modal size="md" height="full">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.votingHistory.modalTitle')}</Modal.Title>
      <Modal.Content>
        <Box padding={[4, 5]} gap={6} fillContainer>
          <Tabs panelClassName="overflow-y-auto grow" items={tabs} onChange={setSelectedTab} />
        </Box>
      </Modal.Content>
    </Modal>
  );
};
