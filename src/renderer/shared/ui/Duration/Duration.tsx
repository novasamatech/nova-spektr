/* eslint-disable i18next/no-literal-string */
import { type ElementType } from 'react';

import { useI18n } from '@/app/providers';

import { DurationFormat } from './common/types';
import { timeUtils } from './common/utils';

type Props = {
  as?: ElementType;
  seconds: string | number;
  hideDaysHours?: boolean;
  className?: string;
};

export const Duration = ({ as: Tag = 'span', seconds, hideDaysHours, className }: Props) => {
  const { t } = useI18n();

  const numericSeconds = typeof seconds === 'string' ? parseInt(seconds) : seconds;
  const duration = timeUtils.secondsToDuration(numericSeconds);
  const i18nKey = timeUtils.getDurationFormat(duration);

  if (i18nKey !== DurationFormat.DAYS_HOURS) {
    const durationParams = timeUtils.getDurationParams(duration, i18nKey);

    return <Tag className={className}>{t(`time.${i18nKey}`, durationParams)}</Tag>;
  }

  const days = t(`time.${DurationFormat.DAYS}`, timeUtils.getDurationParams(duration, DurationFormat.DAYS));
  const hours = t(`time.${DurationFormat.HOURS}`, timeUtils.getDurationParams(duration, DurationFormat.HOURS));

  return (
    <Tag className={className}>
      {days}&nbsp;{!hideDaysHours && hours}
    </Tag>
  );
};
