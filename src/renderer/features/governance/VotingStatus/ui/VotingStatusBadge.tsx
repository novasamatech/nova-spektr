import { useI18n } from '@app/providers';
import { OperationStatus } from '@shared/ui';
import { type CompletedReferendum, type OngoingReferendum, ReferendumType } from '@shared/core';

type Props = {
  passing?: boolean;
  referendum: OngoingReferendum | CompletedReferendum;
};

const statusesMap: Record<
  Exclude<ReferendumType, ReferendumType.Ongoing | ReferendumType.Approved>,
  { text: string; pallet: 'default' | 'success' | 'error' }
> = {
  [ReferendumType.Rejected]: { text: 'governance.referendums.rejected', pallet: 'error' },
  [ReferendumType.Cancelled]: { text: 'governance.referendums.cancelled', pallet: 'default' },
  [ReferendumType.Killed]: { text: 'governance.referendums.killed', pallet: 'error' },
  [ReferendumType.TimedOut]: { text: 'governance.referendums.timedOut', pallet: 'default' },
};

export const VotingStatusBadge = ({ passing, referendum }: Props) => {
  const { t } = useI18n();

  if (referendum.type === ReferendumType.Ongoing) {
    const isPassing = passing ?? false;

    return (
      <OperationStatus pallet={isPassing ? 'success' : 'default'}>
        {isPassing ? t('governance.referendums.passing') : t('governance.referendums.deciding')}
      </OperationStatus>
    );
  }

  if (referendum.type === ReferendumType.Approved) {
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
