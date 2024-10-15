import { formatDistanceStrict } from 'date-fns/formatDistanceStrict';
import { memo } from 'react';

import { type Conviction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';

import { DiffValue } from './DiffValue';

type Props = {
  from: Conviction;
  to: Conviction;
  lockPeriods: Record<Conviction, number> | null;
};

export const LockPeriodDiff = memo(({ from, to, lockPeriods }: Props) => {
  const { t, dateLocale } = useI18n();

  if (!lockPeriods) return null;
  const date = new Date(0);

  const fromLockPeriod = formatDistanceStrict(lockPeriods[from], date, { unit: 'day', locale: dateLocale });
  const toLockPeriod = formatDistanceStrict(lockPeriods[to], date, { unit: 'day', locale: dateLocale });

  return (
    <DiffValue
      from={fromLockPeriod.toString()}
      to={toLockPeriod.toString()}
      diff={t('time.days', {
        count: parseInt(formatDistanceStrict(lockPeriods[to], lockPeriods[from], { unit: 'day', locale: dateLocale })),
      })}
      positive={lockPeriods[to] - lockPeriods[from] >= 0}
    />
  );
});
