import { type Duration as DurationType } from 'date-fns';
import { formatDuration } from 'date-fns/formatDuration';
import { intervalToDuration } from 'date-fns/intervalToDuration';
import { type ElementType, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';

type Props = {
  as?: ElementType;
  seconds: string | number;
  className?: string;
  testId?: string;
  shortFormat?: boolean;
};

const stripDuration = (duration: DurationType): DurationType => {
  if (duration.years) {
    return {
      years: duration.years,
      months: duration.months,
    };
  }

  if (duration.months) {
    return {
      months: duration.months,
      days: duration.days,
    };
  }

  if (duration.days) {
    return {
      days: duration.days,
      hours: duration.hours,
    };
  }

  if (duration.hours) {
    return {
      hours: duration.hours,
    };
  }

  if (duration.minutes) {
    return { minutes: duration.minutes };
  }

  return { seconds: duration.seconds };
};

export const Duration = ({ as: Tag = 'span', seconds, className, testId = 'Duration', shortFormat = false }: Props) => {
  const { dateLocale, shortDateLocale } = useI18n();
  const numericSeconds = typeof seconds === 'string' ? parseInt(seconds) : seconds;

  const duration = useMemo(() => {
    const duration = intervalToDuration({ start: 0, end: numericSeconds * 1000 });

    return stripDuration(duration);
  }, [numericSeconds]);

  const formatted = useMemo(
    () => formatDuration(duration, { locale: shortFormat ? shortDateLocale : dateLocale }),
    [duration, dateLocale, shortDateLocale, shortFormat],
  );

  return (
    <Tag className={className} data-testid={testId}>
      {formatted}
    </Tag>
  );
};
