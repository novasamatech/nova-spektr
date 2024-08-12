import { useGate, useStoreMap, useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@app/providers';
import { type Referendum } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { cnTw } from '@shared/lib/utils';
import { BaseModal, Icon, Tabs } from '@shared/ui';
import { type TabItem } from '@shared/ui/Tabs/common/types';
import { voteHistoryAggregate } from '../../aggregates/voteHistory';

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
  const [selectedTab, setSelectedTab] = useState(0);

  const chain = useUnit(voteHistoryAggregate.$chain);

  const voteHistory = useStoreMap({
    store: voteHistoryAggregate.$voteHistory,
    keys: [referendum.referendumId],
    fn: (x, [referendumId]) => x[referendumId] ?? [],
  });

  const votingAsset = useUnit(voteHistoryAggregate.$votingAsset);
  const isLoading = useUnit(voteHistoryAggregate.$isLoading);

  const ayes = useMemo(() => voteHistory.filter((history) => history.decision === 'aye'), [voteHistory]);
  const nays = useMemo(() => voteHistory.filter((history) => history.decision === 'nay'), [voteHistory]);
  const abstain = useMemo(() => voteHistory.filter((history) => history.decision === 'abstain'), [voteHistory]);

  const tabs: TabItem[] = [
    {
      id: 'ayes',
      title: (
        <span className="flex items-center gap-1">
          <Icon name="thumbUp" size={16} className={cnTw(selectedTab === 0 && 'text-icon-positive')} />
          <span>{t('governance.referendum.ayes')}</span>
          <VoteCount count={ayes.length} loading={isLoading} />
        </span>
      ),
      panel: <VotingHistoryList chain={chain} asset={votingAsset} items={ayes} loading={isLoading} />,
    },
    {
      id: 'nays',
      title: (
        <span className="flex items-center gap-1">
          <Icon name="thumbDown" size={16} className={cnTw(selectedTab === 1 && 'text-icon-negative')} />
          <span>{t('governance.referendum.nays')}</span>
          <VoteCount count={nays.length} loading={isLoading} />
        </span>
      ),
      panel: <VotingHistoryList chain={chain} asset={votingAsset} items={nays} loading={isLoading} />,
    },
    {
      id: 'abstain',
      title: (
        <span className="flex items-center gap-1">
          <Icon name="minusCircle" size={16} />
          <span>{t('governance.referendum.abstain')}</span>
          <VoteCount count={abstain.length} loading={isLoading} />
        </span>
      ),
      panel: <VotingHistoryList chain={chain} asset={votingAsset} items={abstain} loading={isLoading} />,
    },
  ];

  return (
    <BaseModal
      isOpen={showModal}
      closeButton
      panelClass="flex flex-col w-modal h-[450px] overflow-hidden"
      headerClass="shrink-0 pl-5 pr-3 pt-3"
      contentClass="flex flex-col py-4 px-5 overflow-hidden"
      title={t('governance.voteHistory.title')}
      onClose={closeModal}
    >
      <Tabs panelClassName="overflow-y-auto" items={tabs} onChange={setSelectedTab} />
    </BaseModal>
  );
};
