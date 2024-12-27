import { useGate, useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Button } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { ERROR } from '../constants';
import { votingHistoryFeatureStatus } from '../model/status';
import { votesModel } from '../model/votes';

import { VotesModal } from './VotesModal';

type Props = {
  referendumId: ReferendumId;
};

export const VotingHistory = ({ referendumId }: Props) => {
  useGate(votingHistoryFeatureStatus.gate);
  useGate(votesModel.gate, { referendumId });
  const { t } = useI18n();

  const featureState = useUnit(votingHistoryFeatureStatus.state);
  const pending = useUnit(votesModel.$pending);
  const isNetworkDisabled = featureState.status === 'failed' && featureState.error.message === ERROR.networkDisabled;

  if (pending || isNetworkDisabled) return <Skeleton width="10ch" height="1lh"></Skeleton>;

  return (
    <VotesModal>
      <Button size="sm" variant="text" className="h-auto p-0">
        {t('fellowship.votingHistory.showHistoryButton')}
      </Button>
    </VotesModal>
  );
};
