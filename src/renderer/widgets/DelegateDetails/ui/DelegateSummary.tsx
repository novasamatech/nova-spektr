import { useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, IconButton, Tabs } from '@/shared/ui';
import { type TabItem } from '@/shared/ui/types';
import { Address } from '@/shared/ui-entities';
import { Graphics, Modal, Skeleton } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { ExplorersPopover } from '@/entities/wallet';
import { type AggregatedReferendum, ReferendumDetailsModal, networkSelectorModel } from '@/features/governance';
import { VotedReferendumItem } from '@/features/governance/components/ReferendumList/VotedReferendumItem';
import { delegateDetailsModel } from '../model/delegate-details-model';
import { type VotedReferendum, delegateSummaryModel } from '../model/delegate-summary-model';

export const DelegateSummary = () => {
  const { t } = useI18n();

  const chain = useUnit(delegateDetailsModel.$chain);
  const delegate = useUnit(delegateDetailsModel.$delegate);
  const isModalOpen = useUnit(delegateSummaryModel.$isModalOpen);
  const votedReferendums = useUnit(delegateSummaryModel.$votedReferendums);
  const votedReferendumsMonth = useUnit(delegateSummaryModel.$votedReferendumsMonth);

  if (!chain || !delegate) return null;

  const tabs: TabItem[] = [
    {
      id: 'delegators',
      title: (
        <span className="flex items-center gap-1">
          {t('governance.addDelegation.card.delegations')}
          <FootnoteText className="text-text-secondary"> {delegate.delegators}</FootnoteText>
        </span>
      ),
      panel: <DelegationsList />,
    },
    {
      id: 'votedMonth',
      title: (
        <span className="flex items-center gap-1">
          {t('governance.addDelegation.card.voted')}
          <FootnoteText className="text-text-secondary"> {delegate.delegateVotesMonth}</FootnoteText>
        </span>
      ),
      panel: <DelegationReferendumList votedReferendums={votedReferendumsMonth} />,
    },
    {
      id: 'voted',
      title: (
        <span className="flex items-center gap-1">
          {t('governance.addDelegation.votedAllTime')}
          <FootnoteText className="text-text-secondary"> {delegate.delegateVotes}</FootnoteText>
        </span>
      ),

      panel: <DelegationReferendumList votedReferendums={votedReferendums} />,
    },
  ];

  return (
    <Modal isOpen={isModalOpen} size="lg" onToggle={() => delegateSummaryModel.events.closeModal()}>
      <Modal.Title close>{t('governance.addDelegation.summary.delegateSummary')}</Modal.Title>
      <Modal.Content>
        <div className="bg-main-app-background px-5 py-4">
          <Tabs items={tabs} />
        </div>
      </Modal.Content>
    </Modal>
  );
};

const Loading = () => (
  <div className="flex flex-col gap-y-5">
    {Array.from({ length: 4 }).map((_, index) => (
      // eslint-disable-next-line react/no-array-index-key
      <div key={index} className="flex items-center justify-between">
        <Skeleton height={5} width={120} />
        <Skeleton height={5} width={50} />
      </div>
    ))}
  </div>
);

const EmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2">
      <Graphics name="emptyList" size={72} />
      <FootnoteText>{t('governance.addDelegation.summary.listEmptyState')}</FootnoteText>
    </div>
  );
};

const DelegationsList = () => {
  const { t } = useI18n();

  const proposers = useUnit(delegateSummaryModel.$proposers);
  const currentDelegations = useUnit(delegateSummaryModel.$currentDelegations);
  const isDelegatingLoading = useUnit(delegateSummaryModel.$isDelegatingLoading);
  const chain = useUnit(delegateDetailsModel.$chain);
  const delegate = useUnit(delegateDetailsModel.$delegate);

  if (delegate && !delegate.delegators) {
    return <EmptyState />;
  }

  if (isDelegatingLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-2 px-5">
      <div className="flex justify-between">
        <FootnoteText className="text-text-tertiary">{t('governance.addDelegation.summary.accountLabel')}</FootnoteText>
        <FootnoteText className="mr-16 text-text-tertiary">
          {t('governance.addDelegation.summary.amountLabel')}
        </FootnoteText>
      </div>
      {currentDelegations.map(([address, delegation]) => (
        <div key={address} className="flex items-center justify-between py-2">
          <BodyText className="flex-1">
            <Address showIcon address={address} title={proposers[address]?.parent.name} variant="full" iconSize={20} />
          </BodyText>
          <div className="mr-6 gap-y-1">
            <BodyText className="text-right">
              <AssetBalance showSymbol value={delegation.amount.toString()} asset={chain?.assets[0]} />
            </BodyText>
            <FootnoteText className="text-text-tertiary">
              {t('governance.addDelegation.summary.acrossTracks', { count: delegation.tracks.length })}
            </FootnoteText>
          </div>
          <div className="w-10">
            <ExplorersPopover
              button={<IconButton className="ml-2 flex" name="info" />}
              address={address}
              addressPrefix={chain?.addressPrefix}
              explorers={chain?.explorers}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const DelegationReferendumList = ({ votedReferendums }: { votedReferendums: VotedReferendum[] }) => {
  const isReferendumsLoading = useUnit(delegateSummaryModel.$isReferendumsLoading);
  const network = useUnit(networkSelectorModel.$network);

  const [selectedReferendum, setSelectedReferendum] = useState<AggregatedReferendum | null>(null);

  if (votedReferendums.length === 0) {
    return <EmptyState />;
  }

  if (isReferendumsLoading || !network) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-2 px-5">
      {votedReferendums.map((referendum) => (
        <VotedReferendumItem
          key={referendum.referendumId}
          referendum={referendum}
          network={network}
          votes={referendum.voted}
          onSelect={(referendum) => setSelectedReferendum(referendum)}
        />
      ))}

      {selectedReferendum && (
        <ReferendumDetailsModal
          referendum={selectedReferendum}
          chain={network.chain}
          api={network.api}
          asset={network.asset}
          showActions={false}
          onClose={() => setSelectedReferendum(null)}
          onVoteRequest={() => {}}
          onRemoveVoteRequest={() => {}}
          onRevoteRequest={() => {}}
        />
      )}
    </div>
  );
};
