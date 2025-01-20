import { formatDistanceStrict } from 'date-fns/formatDistanceStrict';
import { memo } from 'react';

import { type Conviction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';

import { DiffValue } from './DiffValue';

type Props = {
  from: Conviction;
  to: Conviction;
  unlock?: boolean;
  lockPeriods: Record<Conviction, number> | null;
};

export const LockPeriodDiff = memo(({ from, to, unlock = false, lockPeriods }: Props) => {
  const { t, dateLocale } = useI18n();

  if (!lockPeriods) return null;
  const date = new Date(0);

  const fromLockPeriod = formatDistanceStrict(lockPeriods[from] * 1000, date, {
    unit: 'day',
    locale: dateLocale,
  });
  const toLockPeriod = formatDistanceStrict(lockPeriods[to] * 1000, date, {
    unit: 'day',
    locale: dateLocale,
  });

  if (unlock) {
    return <FootnoteText className="text-text-primary">{fromLockPeriod}</FootnoteText>;
  }

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
