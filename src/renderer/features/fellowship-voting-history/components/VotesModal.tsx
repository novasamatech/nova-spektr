import { useGate, useUnit } from 'effector-react';
import orderBy from 'lodash/orderBy';
import { type PropsWithChildren, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon, Tabs } from '@/shared/ui';
import { type TabItem } from '@/shared/ui/types';
import { Box, Carousel, Modal, SearchInput } from '@/shared/ui-kit';
import { votingHistoryFeatureStatus } from '../model/status';
import { votesModel } from '../model/votes';

import { VotingHistoryList } from './VotingHistoryList';

export const VotesModal = ({ children }: PropsWithChildren) => {
  useGate(votingHistoryFeatureStatus.gate);

  const { t } = useI18n();
  const [query, setQuery] = useState<string>('');
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
      panel: null,
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
      panel: null,
    },
  ];

  return (
    <Modal size="md" height="full">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.votingHistory.modalTitle')}</Modal.Title>
      <Modal.HeaderContent>
        <Box padding={[4, 5, 2]}>
          <Tabs panelClassName="m-0" tabsClassName="mb-6" items={tabs} onChange={setSelectedTab} />
          <SearchInput placeholder={t('governance.searchPlaceholder')} value={query} onChange={setQuery} />
        </Box>
      </Modal.HeaderContent>
      <Modal.Content>
        <Carousel item={selectedTab.toString()}>
          <Carousel.Item id="0">
            <VotingHistoryList query={query} chain={chain} items={ayes} loading={isLoading} />
          </Carousel.Item>
          <Carousel.Item id="1">
            <VotingHistoryList query={query} chain={chain} items={nays} loading={isLoading} />
          </Carousel.Item>
        </Carousel>
      </Modal.Content>
    </Modal>
  );
};
