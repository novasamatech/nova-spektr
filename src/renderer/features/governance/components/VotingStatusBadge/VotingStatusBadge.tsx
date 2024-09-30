import { useI18n } from '@app/providers';
import { type CompletedReferendum, type OngoingReferendum, type ReferendumType } from '@shared/core';
import { OperationStatus } from '@shared/ui';
import { referendumService } from '@entities/governance';

type Props = {
  passing?: boolean;
  referendum: OngoingReferendum | CompletedReferendum;
};

const statusesMap: Record<
  Exclude<ReferendumType, 'Ongoing' | 'Approved'>,
  { text: string; pallet: 'default' | 'success' | 'error' }
> = {
  Rejected: { text: 'governance.referendums.rejected', pallet: 'error' },
  Cancelled: { text: 'governance.referendums.cancelled', pallet: 'default' },
  Killed: { text: 'governance.referendums.killed', pallet: 'error' },
  TimedOut: { text: 'governance.referendums.timedOut', pallet: 'default' },
};

export const VotingStatusBadge = ({ referendum }: Props) => {
  const { t } = useI18n();

  if (referendumService.isOngoing(referendum)) {
    const status = referendumService.getReferendumStatus(referendum);

    const statusText = {
      NoDeposit: t('governance.referendums.noDeposit'),
      Deciding: t('governance.referendums.deciding'),
      Passing: t('governance.referendums.passing'),
      Execute: t('governance.referendums.approved'),
    }[status];

    return <OperationStatus pallet={status === 'Passing' ? 'success' : 'default'}>{statusText}</OperationStatus>;
  }

  if (referendumService.isApproved(referendum)) {
    // TODO implement
    const isExecuted = false;

    return (
      <OperationStatus pallet="success">
        {isExecuted ? t('governance.referendums.executed') : t('governance.referendums.approved')}
      </OperationStatus>
    );
  }

  const status = statusesMap[referendum.type];

  return <OperationStatus pallet={status.pallet}>{t(status.text)}</OperationStatus>;
};
