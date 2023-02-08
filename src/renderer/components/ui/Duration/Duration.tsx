/* eslint-disable i18next/no-literal-string */
import { useI18n } from '@renderer/context/I18nContext';
import { secondsToDuration, getDurationFormat, getDurationParams, DurationFormat } from '@renderer/shared/utils/time';

interface Props {
  seconds: string;
  className?: string;
}

const Duration = ({ seconds, className }: Props) => {
  const { t } = useI18n();

  const duration = secondsToDuration(parseInt(seconds));
  const i18nKey = getDurationFormat(duration);
  const durationParams = getDurationParams(duration, i18nKey);

  if (i18nKey === DurationFormat.DAYS_HOURS) {
    return (
      <span className={className}>
        {t(`time.${DurationFormat.DAYS}`, getDurationParams(duration, DurationFormat.DAYS))}{' '}
        {t(`time.${DurationFormat.HOURS}`, getDurationParams(duration, DurationFormat.HOURS))}
      </span>
    );
  }

  return <span className={className}>{t(`time.${i18nKey}`, durationParams)}</span>;
};

export default Duration;
