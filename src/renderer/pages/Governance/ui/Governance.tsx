import { useGate, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { useI18n } from '@app/providers';
import { type Referendum, type ReferendumId } from '@shared/core';
import { nonNullable } from '@shared/lib/utils';
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
  delegationAggregate,
  networkSelectorModel,
} from '@features/governance';
import { CurrentDelegationModal, currentDelegationModel } from '@/widgets/CurrentDelegationsModal';
import { DelegateDetails } from '@/widgets/DelegateDetails';
import { DelegationModal, delegationModel } from '@/widgets/DelegationModal';
import { RemoveVoteModal } from '@/widgets/RemoveVoteModal';
import { UnlockModal, unlockAggregate } from '@/widgets/UnlockModal';
import { VoteModal } from '@widgets/VoteModal';
import { governancePageAggregate } from '../aggregates/governancePage';

import { EmptyGovernance } from './EmptyGovernance';

export const Governance = () => {
  useGate(governancePageAggregate.gates.flow);

  const { t } = useI18n();

  const [selectedReferendumId, setSelectedReferendumId] = useState<ReferendumId | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showRemoveVoteModal, setShowRemoveVoteModal] = useState(false);
  const isApiConnected = useUnit(networkSelectorModel.$isApiConnected);
  const network = useUnit(networkSelectorModel.$network);
  const hasDelegations = useUnit(delegationAggregate.$hasDelegations);

  const isLoading = useUnit(governancePageAggregate.$isLoading);
  const isTitlesLoading = useUnit(governancePageAggregate.$isTitlesLoading);
  const isSerching = useUnit(governancePageAggregate.$isSerching);
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

  const shouldShowLoadingState = isLoading || (isSerching && isTitlesLoading);
  const shouldNetworkDisabledError = !isApiConnected && !shouldShowLoadingState && all.length === 0;
  const shouldRenderEmptyState = !shouldShowLoadingState && isApiConnected && all.length === 0;
  const shouldRenderList = shouldShowLoadingState || (!shouldRenderEmptyState && !shouldNetworkDisabledError);

  useEffect(() => {
    if (!selectedReferendum || referendumService.isCompleted(selectedReferendum)) {
      setShowVoteModal(false);
      setShowRemoveVoteModal(false);
    }
  }, [selectedReferendum]);

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
            <TotalDelegation
              onClick={() =>
                hasDelegations ? currentDelegationModel.events.flowStarted() : delegationModel.events.flowStarted()
              }
            />
          </div>

          <div className="mb-4 mt-5">
            <ReferendumFilters />
          </div>

          {shouldRenderEmptyState && <EmptyGovernance />}
          {shouldNetworkDisabledError && <InactiveNetwork active className="grow" />}
          {shouldRenderList && (
            <div className="flex flex-col gap-y-3 pb-10">
              <OngoingReferendums
                referendums={ongoing}
                isTitlesLoading={isTitlesLoading}
                isLoading={isLoading}
                mixLoadingWithData={shouldShowLoadingState}
                onSelect={selectReferendum}
              />
              <CompletedReferendums
                referendums={completed}
                isTitlesLoading={isTitlesLoading}
                isLoading={isLoading}
                mixLoadingWithData={shouldShowLoadingState}
                onSelect={selectReferendum}
              />
            </div>
          )}
        </section>
      </div>

      {selectedReferendum && nonNullable(network) && (
        <ReferendumDetailsDialog
          referendum={selectedReferendum}
          chain={network.chain}
          onVoteRequest={() => {
            setShowVoteModal(true);
            setShowRemoveVoteModal(false);
          }}
          onRemoveVoteRequest={() => {
            setShowRemoveVoteModal(true);
            setShowVoteModal(false);
          }}
          onClose={() => {
            setShowVoteModal(false);
            setShowRemoveVoteModal(false);
            setSelectedReferendumId(null);
          }}
        />
      )}

      {showVoteModal &&
        nonNullable(selectedReferendum) &&
        nonNullable(network) &&
        referendumService.isOngoing(selectedReferendum) && (
          <VoteModal
            referendum={selectedReferendum}
            chain={network.chain}
            asset={network.asset}
            onClose={() => setShowVoteModal(false)}
          />
        )}

      {showRemoveVoteModal &&
        nonNullable(selectedReferendum) &&
        nonNullable(selectedReferendum.vote) &&
        nonNullable(network) &&
        referendumService.isOngoing(selectedReferendum) && (
          <RemoveVoteModal
            voter={selectedReferendum.vote.voter}
            vote={selectedReferendum.vote.vote}
            referendum={selectedReferendum}
            asset={network.asset}
            chain={network.chain}
            api={network.api}
            onClose={() => setShowRemoveVoteModal(false)}
          />
        )}

      <CurrentDelegationModal />
      <DelegationModal />
      <DelegateDetails />

      <UnlockModal />
    </div>
  );
};
