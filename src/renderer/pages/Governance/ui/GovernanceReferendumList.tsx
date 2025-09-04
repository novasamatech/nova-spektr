import { useUnit } from 'effector-react';
import { Outlet, generatePath, useParams } from 'react-router-dom';

import { type ReferendumId } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { AsyncItem, Box } from '@/shared/ui-kit';
import { InactiveNetwork } from '@/entities/network';
import { CompletedReferendums, OngoingReferendums, networkSelectorModel } from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { governancePageAggregate } from '../aggregates/governancePage';

import { EmptyGovernance } from './EmptyGovernance';

export const GovernanceReferendumList = () => {
  const { chainId } = useParams<'chainId'>();

  const isApiConnected = useUnit(networkSelectorModel.$isApiConnected);
  const network = useUnit(networkSelectorModel.$network);

  const isLoading = useUnit(governancePageAggregate.$isLoading);
  const isTitlesLoading = useUnit(governancePageAggregate.$isTitlesLoading);
  const isApprovalThresholdsLoading = useUnit(governancePageAggregate.$isApprovalThresholdsLoading);
  const isSearching = useUnit(governancePageAggregate.$isSearching);
  const displayedReferendums = useUnit(governancePageAggregate.$displayedReferendums);
  const ongoing = useUnit(governancePageAggregate.$ongoing);
  const completed = useUnit(governancePageAggregate.$completed);

  if (nullable(chainId)) {
    return null;
  }

  const navigate = (referendumId: ReferendumId) => {
    navigationModel.events.navigateTo(generatePath(Paths.GOVERNANCE_REFERENDUM, { chainId, referendumId }));
  };

  const isLoadingState = isLoading || (isSearching && isTitlesLoading);
  const isNetworkDisabled = !isApiConnected && !isLoadingState && displayedReferendums.length === 0;
  const isEmptyState = isApiConnected && !isLoadingState && displayedReferendums.length === 0;
  const isRegularState = isLoadingState || (!isEmptyState && !isNetworkDisabled);

  return (
    <Box gap={4} grow={1}>
      {isEmptyState && <EmptyGovernance />}

      {isNetworkDisabled && <InactiveNetwork active className="grow" />}

      {isRegularState && (
        <Box direction="column" gap={3} padding={[0, 0, 10]}>
          <OngoingReferendums
            api={network?.api}
            chain={network?.chain}
            asset={network?.asset}
            referendums={ongoing}
            isLoading={isLoading}
            isTitlesLoading={isTitlesLoading}
            isApprovalThresholdsLoading={isApprovalThresholdsLoading}
            mixLoadingWithData={isLoadingState}
            onSelect={({ referendumId }) => navigate(referendumId)}
          />
          <AsyncItem>
            <CompletedReferendums
              api={network?.api}
              chain={network?.chain}
              asset={network?.asset}
              referendums={completed}
              isLoading={isLoading}
              isTitlesLoading={isTitlesLoading}
              mixLoadingWithData={isLoadingState}
              onSelect={({ referendumId }) => navigate(referendumId)}
            />
          </AsyncItem>
        </Box>
      )}

      <Outlet />
    </Box>
  );
};
