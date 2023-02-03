/* eslint-disable i18next/no-literal-string */
import { HTMLAttributes } from 'react';
import cn from 'classnames';

import {
  getDurationFormat,
  getDurationParams,
  secondsToDuration,
  DurationFormat,
} from '@renderer/screens/Signing/common/utils';
import { useI18n } from '@renderer/context/I18nContext';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  seconds: string;
}

const Duration = ({ seconds, className }: Props) => {
  const { t } = useI18n();

  const duration = secondsToDuration(parseInt(seconds));
  const i18nKey = getDurationFormat(duration);
  const durationParams = getDurationParams(duration, i18nKey);

  if (i18nKey === DurationFormat.DAYS_HOURS) {
    return (
      <span className={cn(className)}>
        {t(`time.${DurationFormat.DAYS}`, getDurationParams(duration, DurationFormat.DAYS))}{' '}
        {t(`time.${DurationFormat.HOURS}`, getDurationParams(duration, DurationFormat.HOURS))}
      </span>
    );
  }

  return <span className={cn(className)}>{t(`time.${i18nKey}`, durationParams)}</span>;
};

export default Duration;
