import { useGate, useStoreMap, useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { type Referendum } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Modal, Tabs } from '@/shared/ui-kit';
import { voteHistoryAggregate } from '../../aggregates/voteHistory';
import { type AggregatedVoteHistory } from '../../types/structs';

import { VoteCount } from './VoteCount';
import { VotingHistoryList } from './VotingHistoryList';

type Props = {
  referendum: Referendum;
  onClose: VoidFunction;
};

export const VotingHistoryDialog = ({ referendum, onClose }: Props) => {
  useGate(voteHistoryAggregate.gates.flow, { referendum });

  const { t } = useI18n();
  const [showModal, closeModal] = useModalClose(true, onClose);
  const [selectedTab, setSelectedTab] = useState('aye');

  const chain = useUnit(voteHistoryAggregate.$chain);

  const voteHistory = useStoreMap({
    store: voteHistoryAggregate.$voteHistory,
    keys: [referendum.referendumId],
    fn: (history, [referendumId]) => history[referendumId] ?? [],
  });

  const votingAsset = useUnit(voteHistoryAggregate.$votingAsset);
  const isLoading = useUnit(voteHistoryAggregate.$isLoading);
  const hasError = useUnit(voteHistoryAggregate.$hasError);

  const { ayes, nays, abstain } = useMemo(() => {
    const result: Record<'ayes' | 'nays' | 'abstain', AggregatedVoteHistory[]> = {
      ayes: [],
      nays: [],
      abstain: [],
    };

    for (const history of voteHistory) {
      if (history.decision === 'aye') result.ayes.push(history);
      else if (history.decision === 'nay') result.nays.push(history);
      else if (history.decision === 'abstain') result.abstain.push(history);
    }

    return result;
  }, [voteHistory]);

  return (
    <Modal isOpen={showModal} size="md" height="lg" onToggle={closeModal}>
      <Modal.Title close>{t('governance.voteHistory.title')}</Modal.Title>
      <Modal.Content disableScroll>
        {hasError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Icon name="document" size={64} className="text-icon-default" />
            <SmallTitleText className="mt-4">{t('governance.voteHistory.notAvailable')}</SmallTitleText>
            <FootnoteText className="text-text-tertiary">
              {t('governance.voteHistory.notAvailableDescription')}
            </FootnoteText>
            <Button
              className="mt-2"
              size="sm"
              onClick={() => voteHistoryAggregate.events.requestVoteHistory({ referendum })}
            >
              {t('general.button.refreshButton')}
            </Button>
          </div>
        ) : (
          <Tabs value={selectedTab} onChange={setSelectedTab}>
            <Box padding={[4, 5, 0]} shrink={0}>
              <Tabs.List>
                <Tabs.Trigger value="aye">
                  <Icon name="thumbUp" size={16} className={cnTw(selectedTab === 'aye' && 'text-icon-positive')} />
                  <span>{t('governance.referendum.ayes')}</span>
                  <VoteCount count={ayes.length} loading={isLoading} />
                </Tabs.Trigger>
                <Tabs.Trigger value="nay">
                  <Icon name="thumbDown" size={16} className={cnTw(selectedTab === 'nay' && 'text-icon-negative')} />
                  <span>{t('governance.referendum.nays')}</span>
                  <VoteCount count={nays.length} loading={isLoading} />
                </Tabs.Trigger>
                <Tabs.Trigger value="abstain">
                  <Icon name="minusCircle" size={16} />
                  <span>{t('governance.referendum.abstain')}</span>
                  <VoteCount count={abstain.length} loading={isLoading} />
                </Tabs.Trigger>
              </Tabs.List>
            </Box>
            <Tabs.Content value="aye">
              <VotingHistoryList chain={chain} asset={votingAsset} items={ayes} listName="Aye" loading={isLoading} />
            </Tabs.Content>
            <Tabs.Content value="nay">
              <VotingHistoryList chain={chain} asset={votingAsset} items={nays} listName="Nay" loading={isLoading} />
            </Tabs.Content>
            <Tabs.Content value="abstain">
              <VotingHistoryList
                chain={chain}
                asset={votingAsset}
                items={abstain}
                listName="Abstain"
                loading={isLoading}
              />
            </Tabs.Content>
          </Tabs>
        )}
      </Modal.Content>
    </Modal>
  );
};
