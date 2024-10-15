import { memo } from 'react';

import { useI18n } from '@/app/providers';
import { type ReferendumType } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { OperationStatus } from '@/shared/ui';
import { Skeleton } from '@shared/ui-kit';
import { type Referendum, collectiveDomain } from '@/domains/collectives';

type Props = {
  referendum: Referendum | null;
  pending: boolean;
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

export const ReferendumVotingStatusBadge = memo<Props>(({ referendum, pending }) => {
  const { t } = useI18n();

  if (nullable(referendum)) {
    if (pending) {
      return (
        <Skeleton active minWidth={20}>
          <OperationStatus pallet="default"></OperationStatus>
        </Skeleton>
      );
    } else {
      return null;
    }
  }

  if (collectiveDomain.referendumService.isOngoing(referendum)) {
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

  if (collectiveDomain.referendumService.isApproved(referendum)) {
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
