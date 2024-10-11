import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { Box } from '@/shared/ui-kit';
import { type Referendum } from '@/domains/collectives';
import { InactiveNetwork } from '@/entities/network';
import { ERROR } from '../../constants';
import { referendumListModel } from '../../model/list';
import { referendumsFeatureStatus } from '../../model/status';

import { CompletedReferendums } from './CompletedReferendums';
import { DisconnectAlert } from './DisconnectAlert';
import { EmptyState } from './EmptyState';
import { OngoingReferendums } from './OngoingReferendums';

type Props = {
  onSelect: (referendum: Referendum) => void;
};

export const Referendums = memo<Props>(({ onSelect }) => {
  useGate(referendumsFeatureStatus.gate);

  const isSerching = false;
  const isTitlesLoading = false;

  const featureState = useUnit(referendumsFeatureStatus.state);
  const referendums = useUnit(referendumListModel.$filteredReferendum);
  const fulfulled = useUnit(referendumListModel.$fulfulled);

  const hasNetworkError = featureState.status === 'failed' && featureState.error.message === ERROR.networkDisabled;

  const shouldShowNetworkDisabledError = hasNetworkError && referendums.length === 0;
  const shouldShowNetworkDisabledWarning = hasNetworkError && referendums.length > 0;
  const shouldShowLoadingState = (!fulfulled || (isSerching && isTitlesLoading)) && !shouldShowNetworkDisabledWarning;
  const shouldRenderEmptyState = !shouldShowLoadingState && !hasNetworkError && referendums.length === 0;
  const shouldRenderList = shouldShowLoadingState || (!shouldRenderEmptyState && !shouldShowNetworkDisabledError);

  return (
    <>
      {shouldRenderEmptyState && <EmptyState />}
      {shouldShowNetworkDisabledError && <InactiveNetwork active className="grow" />}
      {shouldRenderList && (
        <Box gap={2} padding={[0, 0, 10]}>
          <DisconnectAlert active={shouldShowNetworkDisabledWarning} />
          <OngoingReferendums
            isTitlesLoading={isTitlesLoading}
            mixLoadingWithData={shouldShowLoadingState}
            onSelect={onSelect}
          />
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
