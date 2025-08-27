import { useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Box, Graphics, Modal, Skeleton, Tabs } from '@/shared/ui-kit';
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

  const [tab, setTab] = useState('delegators');

  if (!chain || !delegate) return null;

  return (
    <Modal isOpen={isModalOpen} size="lg" onToggle={() => delegateSummaryModel.events.closeModal()}>
      <Modal.Title close>{t('governance.addDelegation.summary.delegationSummary')}</Modal.Title>
      <Modal.Content>
        <div className="bg-main-app-background px-5 py-4">
          <Tabs value={tab} onChange={setTab}>
            <Tabs.List>
              <Tabs.Trigger value="delegators">
                <span className="flex items-center gap-1">
                  {t('governance.addDelegation.card.delegations')}
                  <FootnoteText className="text-text-secondary"> {delegate.delegators}</FootnoteText>
                </span>
              </Tabs.Trigger>
              <Tabs.Trigger value="votedMonth">
                <span className="flex items-center gap-1">
                  {t('governance.addDelegation.card.voted')}
                  <FootnoteText className="text-text-secondary"> {delegate.delegateVotesMonth}</FootnoteText>
                </span>
              </Tabs.Trigger>
              <Tabs.Trigger value="voted">
                <span className="flex items-center gap-1">
                  {t('governance.addDelegation.votedAllTime')}
                  <FootnoteText className="text-text-secondary"> {delegate.delegateVotes}</FootnoteText>
                </span>
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="delegators">
              <div className="mt-4">
                <DelegationsList />
              </div>
            </Tabs.Content>
            <Tabs.Content value="votedMonth">
              <div className="mt-4">
                <DelegationReferendumList votedReferendums={votedReferendumsMonth} />
              </div>
            </Tabs.Content>
            <Tabs.Content value="voted">
              <div className="mt-4">
                <DelegationReferendumList votedReferendums={votedReferendums} />
              </div>
            </Tabs.Content>
          </Tabs>
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

  const chain = useUnit(delegateDetailsModel.$chain);
  const delegate = useUnit(delegateDetailsModel.$delegate);
  const proposers = useUnit(delegateSummaryModel.$proposers);
  const currentDelegations = useUnit(delegateSummaryModel.$currentDelegations);
  const isDelegatingLoading = useUnit(delegateSummaryModel.$isDelegatingLoading);

  if (delegate && !delegate.delegators) {
    return <EmptyState />;
  }

  if (isDelegatingLoading || nullable(chain)) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <FootnoteText className="text-text-tertiary">{t('governance.addDelegation.summary.accountLabel')}</FootnoteText>
        <FootnoteText className="text-text-tertiary">
          {t('governance.addDelegation.summary.delegatedLabel')}
        </FootnoteText>
      </div>
      {currentDelegations.map(([accountId, delegation]) => (
        <div key={accountId} className="flex items-center justify-between py-2">
          <Account
            hideAddress
            iconSize={20}
            title={proposers[accountId]?.parent.name}
            accountId={accountId}
            chain={chain}
          />
          <Box direction="column" horizontalAlign="end">
            <AssetBalance showSymbol value={delegation.amount.toString()} asset={chain?.assets[0]} />
            <FootnoteText className="text-text-tertiary">
              {t('governance.addDelegation.summary.acrossTracks', { count: delegation.tracks.length })}
            </FootnoteText>
          </Box>
        </div>
      ))}
    </div>
  );
};

const DelegationReferendumList = ({ votedReferendums }: { votedReferendums: VotedReferendum[] }) => {
  const network = useUnit(networkSelectorModel.$network);
  const isReferendumsLoading = useUnit(delegateSummaryModel.$isReferendumsLoading);

  const [selectedReferendum, setSelectedReferendum] = useState<AggregatedReferendum | null>(null);

  if (votedReferendums.length === 0) {
    return <EmptyState />;
  }

  if (isReferendumsLoading || !network) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-2">
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
