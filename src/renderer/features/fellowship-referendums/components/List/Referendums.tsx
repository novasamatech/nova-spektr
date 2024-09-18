import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { Box } from '@shared/ui-kit';
import { type Referendum } from '@/domains/collectives';
import { InactiveNetwork } from '@entities/network';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';
import { referendumListModel } from '../../model/list';
import { referendumsFeatureStatus } from '../../model/status';

import { CompletedReferendums } from './CompletedReferendums';
import { EmptyState } from './EmptyState';

type Props = {
  onSelect: (referendum: Referendum) => void;
};

export const Referendums = memo<Props>(({ onSelect }) => {
  useGate(referendumsFeatureStatus.gate);

  const isSerching = false;
  const isTitlesLoading = false;

  const [referendums, pending] = useUnit([referendumListModel.$referendums, referendumListModel.$pending]);
  const isApiConnected = useUnit(fellowshipNetworkFeature.model.network.$isConnected);
  const shouldShowLoadingState = pending || (isSerching && isTitlesLoading);
  const shouldNetworkDisabledError = !isApiConnected && !shouldShowLoadingState && referendums.length === 0;
  const shouldRenderEmptyState = !shouldShowLoadingState && isApiConnected && referendums.length === 0;
  const shouldRenderList = shouldShowLoadingState || (!shouldRenderEmptyState && !shouldNetworkDisabledError);

  return (
    <>
      {shouldRenderEmptyState && <EmptyState />}
      {shouldNetworkDisabledError && <InactiveNetwork active className="grow" />}
      {shouldRenderList && (
        <Box gap={3} padding={[0, 0, 10]}>
          {/*<OngoingReferendums*/}
          {/*  referendums={ongoing}*/}
          {/*  isTitlesLoading={isTitlesLoading}*/}
          {/*  isLoading={isLoading}*/}
          {/*  mixLoadingWithData={shouldShowLoadingState}*/}
          {/*  onSelect={selectReferendum}*/}
          {/*/>*/}
          <CompletedReferendums
            isTitlesLoading={false}
            mixLoadingWithData={shouldShowLoadingState}
            onSelect={onSelect}
          />
        </Box>
      )}
    </>
  );
});
