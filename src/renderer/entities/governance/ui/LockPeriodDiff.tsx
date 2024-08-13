import { memo } from 'react';

import { useI18n } from '@app/providers';
import { type Conviction } from '@shared/core';
import { locksService } from '../lib/lockService';

import { DiffValue } from './DiffValue';

type Props = {
  from: Conviction;
  to: Conviction;
};

export const LockPeriodDiff = memo(({ from, to }: Props) => {
  const { t } = useI18n();

  const fromLockPeriod = locksService.getLockPeriods(from);
  const toLockPeriod = locksService.getLockPeriods(to);

  return (
    <DiffValue
      from={fromLockPeriod.toString()}
      to={toLockPeriod.toString()}
      diff={t('time.days', {
        count: Math.abs(toLockPeriod - fromLockPeriod),
      })}
      positive={toLockPeriod - fromLockPeriod >= 0}
    />
  );
});
