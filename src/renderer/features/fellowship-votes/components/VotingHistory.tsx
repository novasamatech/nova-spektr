import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Button } from '@/shared/ui';
import { ERROR } from '../constants';
import { votesFeatureStatus } from '../model/status';
import { votesModel } from '../model/votes';

import { VotesModal } from './VotesModal';

type Props = {
  referendumId: ReferendumId | null;
};

export const VotingHistory = memo<Props>(({ referendumId }) => {
  useGate(votesFeatureStatus.gate);
  useGate(votesModel.gate, { referendumId });
  const { t } = useI18n();

  const featureState = useUnit(votesFeatureStatus.state);
  const pending = useUnit(votesModel.$pending);
  const isNetworkDisabled = featureState.status === 'failed' && featureState.error.message === ERROR.networkDisabled;

  if (pending || isNetworkDisabled) {
    return null;
  }

  return (
    <VotesModal>
      <Button size="sm" variant="text">
        {t('fellowship.votingHistory.showHistoryButton')}
      </Button>
    </VotesModal>
  );
});
