import { useGate, useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@app/providers';
import { type Referendum, type ReferendumId } from '@shared/core';
import { Header, Plate } from '@shared/ui';
import { referendumService } from '@entities/governance';
import { InactiveNetwork } from '@entities/network';
import {
  CompletedReferendums,
  Locks,
  NetworkSelector,
  OngoingReferendums,
  ReferendumDetailsDialog,
  ReferendumFilters,
  ReferendumSearch,
  TotalDelegation,
  networkSelectorModel,
  votingAssetModel,
} from '@features/governance';
import { DelegationModal } from '@/widgets/DelegationModal/components/DelegationModal';
import { delegationModel } from '@/widgets/DelegationModal/model/delegation-model';
import { UnlockModal, unlockAggregate } from '@/widgets/UnlockModal';
import { VoteModal } from '@widgets/VoteModal';
import { governancePageAggregate } from '../aggregates/governancePage';

import { EmptyGovernance } from './EmptyGovernance';

export const Governance = () => {
  useGate(governancePageAggregate.gates.flow);

  const { t } = useI18n();

  const [selectedReferendumId, setSelectedReferendumId] = useState<ReferendumId | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const isApiConnected = useUnit(networkSelectorModel.$isApiConnected);
  const chain = useUnit(networkSelectorModel.$governanceChain);
  const asset = useUnit(votingAssetModel.$votingAsset);

  const isLoading = useUnit(governancePageAggregate.$isLoading);
  const isTitlesLoading = useUnit(governancePageAggregate.$isTitlesLoading);
  const all = useUnit(governancePageAggregate.$all);
  const ongoing = useUnit(governancePageAggregate.$ongoing);
  const completed = useUnit(governancePageAggregate.$completed);

  const selectReferendum = (referendum: Referendum) => {
    setSelectedReferendumId(referendum.referendumId);
  };

  const selectedReferendum = useMemo(() => {
    if (!selectedReferendumId) return null;

    return all.find((x) => x.referendumId === selectedReferendumId) ?? null;
  }, [all, selectedReferendumId]);

  return (
    <div className="flex h-full flex-col">
      <Header title={t('governance.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <ReferendumSearch />
      </Header>

      <div className="h-full w-full overflow-y-auto py-6">
        <section className="mx-auto flex h-full w-[736px] flex-col">
          <div className="mb-2 flex gap-x-3">
            <Plate className="h-[90px] w-[240px] px-4 pb-4.5 pt-3">
              <NetworkSelector />
            </Plate>
            <Locks onClick={unlockAggregate.events.flowStarted} />
            <TotalDelegation onClick={delegationModel.events.flowStarted} />
          </div>

          <div className="mb-4 mt-5">
            <ReferendumFilters />
          </div>

          <div className="flex flex-col gap-y-3">
            <OngoingReferendums
              referendums={ongoing}
              isTitlesLoading={isTitlesLoading}
              isLoading={isLoading}
              onSelect={selectReferendum}
            />
            <CompletedReferendums
              referendums={completed}
              isTitlesLoading={isTitlesLoading}
              isLoading={isLoading}
              onSelect={selectReferendum}
            />
          </div>

          <EmptyGovernance />
          <InactiveNetwork active={!isApiConnected} isLoading={isLoading} className="flex-grow" />
        </section>
      </div>

      {selectedReferendum && chain && (
        <ReferendumDetailsDialog
          referendum={selectedReferendum}
          chain={chain}
          onVoteRequest={() => setShowVoteModal(true)}
          onClose={() => {
            setShowVoteModal(false);
            setSelectedReferendumId(null);
          }}
        />
      )}

      {selectedReferendum && referendumService.isOngoing(selectedReferendum) && chain && asset && showVoteModal && (
        <VoteModal
          referendum={selectedReferendum}
          chain={chain}
          asset={asset}
          onClose={() => setShowVoteModal(false)}
        />
      )}

      <DelegationModal />
      <UnlockModal />
    </div>
  );
};
