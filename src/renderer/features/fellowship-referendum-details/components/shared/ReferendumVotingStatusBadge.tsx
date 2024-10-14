import { memo } from 'react';

import { useI18n } from '@/app/providers';
import { type ReferendumType } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { OperationStatus } from '@/shared/ui';
import { type Referendum, collectiveDomain } from '@/domains/collectives';

type Props = {
  referendum: Referendum;
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

export const ReferendumVotingStatusBadge = memo<Props>(({ referendum }) => {
  const { t } = useI18n();

  if (collectiveDomain.referendum.service.isOngoing(referendum)) {
    let status = 'Deciding';

    if (nullable(referendum.decisionDeposit)) {
      status = 'NoDeposit';
    } else if (nonNullable(referendum.deciding?.confirming)) {
      status = 'Passing';
    }

    const statusText = {
      NoDeposit: t('governance.referendums.noDeposit'),
      Deciding: t('governance.referendums.deciding'),
      Passing: t('governance.referendums.passing'),
    }[status];

    return <OperationStatus pallet={status === 'Passing' ? 'success' : 'default'}>{statusText}</OperationStatus>;
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
});
