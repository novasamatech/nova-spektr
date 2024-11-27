import { useGate, useUnit } from 'effector-react';
import { Outlet, generatePath, useParams } from 'react-router-dom';

import { Paths } from '@/shared/routes';
import { Box } from '@/shared/ui-kit';
import { InactiveNetwork } from '@/entities/network';
import { CompletedReferendums, Filters, OngoingReferendums, networkSelectorModel } from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { governancePageAggregate } from '../aggregates/governancePage';

import { EmptyGovernance } from './EmptyGovernance';

export const GovernanceReferendumList = () => {
  useGate(governancePageAggregate.gates.flow);
  const { chainId } = useParams<'chainId'>();

  const isApiConnected = useUnit(networkSelectorModel.$isApiConnected);
  const network = useUnit(networkSelectorModel.$network);

  const isLoading = useUnit(governancePageAggregate.$isLoading);
  const isTitlesLoading = useUnit(governancePageAggregate.$isTitlesLoading);
  const isSearching = useUnit(governancePageAggregate.$isSearching);
  const all = useUnit(governancePageAggregate.$all);
  const ongoing = useUnit(governancePageAggregate.$ongoing);
  const completed = useUnit(governancePageAggregate.$completed);

  if (!chainId) {
    return null;
  }

  const shouldShowLoadingState = isLoading || (isSearching && isTitlesLoading);

  const shouldNetworkDisabledError = !isApiConnected && !shouldShowLoadingState && all.length === 0;

  const shouldRenderEmptyState = !shouldShowLoadingState && isApiConnected && all.length === 0;
  const shouldRenderList = shouldShowLoadingState || (!shouldRenderEmptyState && !shouldNetworkDisabledError);

  return (
    <Box gap={4} grow={1}>
      <Filters />

      {shouldRenderEmptyState && <EmptyGovernance />}
      {shouldNetworkDisabledError && <InactiveNetwork active className="grow" />}
      {shouldRenderList && network && (
        <div className="flex flex-col gap-y-3 pb-10">
          <OngoingReferendums
            referendums={ongoing}
            isTitlesLoading={isTitlesLoading}
            isLoading={isLoading}
            mixLoadingWithData={shouldShowLoadingState}
            api={network.api}
            onSelect={(referendum) => {
              navigationModel.events.navigateTo(
                generatePath(Paths.GOVERNANCE_REFERENDUM, {
                  chainId,
                  referendumId: referendum.referendumId,
                }),
              );
            }}
          />
          <CompletedReferendums
            referendums={completed}
            isTitlesLoading={isTitlesLoading}
            isLoading={isLoading}
            mixLoadingWithData={shouldShowLoadingState}
            api={network.api}
            onSelect={(referendum) =>
              navigationModel.events.navigateTo(
                generatePath(Paths.GOVERNANCE_REFERENDUM, {
                  chainId,
                  referendumId: referendum.referendumId,
                }),
              )
            }
          />
        </div>
      )}

      <Outlet />
    </Box>
  );
};
