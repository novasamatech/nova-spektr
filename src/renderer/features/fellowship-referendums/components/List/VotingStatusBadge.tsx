import { useI18n } from '@app/providers';
import { OperationStatus } from '@shared/ui';
import { type Referendum, collectiveDomain } from '@/domains/collectives';

type Props = {
  passing?: boolean;
  referendum: Referendum;
};

const statusesMap = {
  Rejected: { text: 'governance.referendums.rejected', pallet: 'error' as const },
  Cancelled: { text: 'governance.referendums.cancelled', pallet: 'default' as const },
  Killed: { text: 'governance.referendums.killed', pallet: 'error' as const },
  TimedOut: { text: 'governance.referendums.timedOut', pallet: 'default' as const },
};

export const VotingStatusBadge = ({ passing, referendum }: Props) => {
  const { t } = useI18n();

  if (collectiveDomain.referendum.service.isOngoing(referendum)) {
    const isPassing = passing ?? false;

    return (
      <OperationStatus pallet={isPassing ? 'success' : 'default'}>
        {isPassing ? t('governance.referendums.passing') : t('governance.referendums.deciding')}
      </OperationStatus>
    );
  }

  if (collectiveDomain.referendum.service.isApproved(referendum)) {
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
