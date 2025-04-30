import { memo, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Duration, FootnoteText, Icon, type IconNames } from '@/shared/ui';

function getTimerColor(variant: Props['variant']) {
  switch (variant) {
    case 'urgent':
      return 'text-text-negative';
    case 'warning':
      return 'text-text-warning';
    default:
      return 'text-text-secondary';
  }
}

type Props = {
  secondsToEnd: number;
  icon?: IconNames;
  variant: 'urgent' | 'warning' | 'idle';
  shortDateFormat?: boolean;
};

export const Timeout = memo(({ secondsToEnd, icon = 'clock', variant, shortDateFormat }: Props) => {
  const { t } = useI18n();

  const [countdown, setCountdown] = useState(secondsToEnd);

  useEffect(() => {
    if (countdown <= 0) return;

    const countdownUnit =
      countdown < 60
        ? 1 // if less then a minute, countdown each second
        : countdown < 3600
          ? 60 // if less then an hour, countdown each minute
          : 3600; // countdown each hour

    const timer = setTimeout(() => setCountdown(countdown - countdownUnit), countdownUnit * 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [countdown]);

  const timerColor = getTimerColor(variant);

  return (
    <div className={cnTw('mr-0.5 flex items-center gap-x-1', timerColor)}>
      <Icon name={icon} size={16} className="text-inherit" />
      <FootnoteText className="text-text-secondary">
        {countdown > 0 ? (
          <Duration seconds={countdown} shortFormat={shortDateFormat} />
        ) : (
          <span data-testid="ExpiredMsg">{t('general.timeout.expired')}</span>
        )}
      </FootnoteText>
    </div>
  );
});
