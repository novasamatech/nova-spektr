import { orderBy } from 'lodash';
import { type PropsWithChildren, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { FootnoteText, Icon, Tabs } from '@/shared/ui';
import { type TabItem } from '@/shared/ui/types';
import { Box, Carousel, Modal, SearchInput } from '@/shared/ui-kit';
import { useReferendumVotes } from '../hooks/useReferendumVotes';

import { VotingHistoryList } from './VotingHistoryList';

type Props = PropsWithChildren<{
  referendumId: ReferendumId;
}>;

export const VotesModal = ({ children, referendumId }: Props) => {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState(0);

  const { votes, pending, chain } = useReferendumVotes(referendumId);

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
          <Icon name="positive" size={16} className={cnTw(selectedTab === 0 && 'text-icon-positive')} />
          <span>{t('fellowship.voting.good')}</span>
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
          <Icon name="negative" size={16} className={cnTw(selectedTab === 1 && 'text-icon-negative')} />
          <span>{t('fellowship.voting.notGood')}</span>
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
          <Tabs
            initialIndex={selectedTab}
            panelClassName="m-0"
            tabsClassName="mb-6"
            items={tabs}
            onChange={setSelectedTab}
          />
          <SearchInput placeholder={t('governance.searchPlaceholder')} value={query} onChange={setQuery} />
        </Box>
      </Modal.HeaderContent>
      <Modal.Content>
        <Carousel item={selectedTab.toString()}>
          <Carousel.Item id="0" index={0}>
            <VotingHistoryList query={query} chain={chain} items={ayes} loading={pending} />
          </Carousel.Item>
          <Carousel.Item id="1" index={1}>
            <VotingHistoryList query={query} chain={chain} items={nays} loading={pending} />
          </Carousel.Item>
        </Carousel>
      </Modal.Content>
    </Modal>
  );
};
