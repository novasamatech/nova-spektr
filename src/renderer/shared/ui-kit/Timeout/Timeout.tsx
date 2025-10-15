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

function getTimerIcon(variant: Props['variant']): IconNames {
  switch (variant) {
    case 'urgent':
      return 'fire';
    case 'warning':
      return 'hourglass';
    default:
      return 'clock';
  }
}

type Props = {
  secondsToEnd: number;
  icon?: IconNames;
  variant: 'urgent' | 'warning' | 'idle';
  shortDateFormat?: boolean;
  textColor?: string;
  hideIconText?: boolean;
  text?: string;
};

export const Timeout = memo(
  ({
    secondsToEnd,
    icon,
    variant,
    shortDateFormat,
    textColor = 'text-text-secondary',
    text,
    hideIconText = false,
  }: Props) => {
    const { t } = useI18n();

    const [countdown, setCountdown] = useState(secondsToEnd);

    useEffect(() => {
      if (countdown <= 0) return;

      let countdownUnit = 3600; // countdown each hour

      if (countdown < 3600) {
        countdownUnit = 60; // if less then an hour, countdown each minute
      }
      if (countdown < 60) {
        countdownUnit = 1; // if less then a minute, countdown each second
      }

      const timer = setTimeout(() => setCountdown(countdown - countdownUnit), countdownUnit * 1000);

      return () => {
        clearTimeout(timer);
      };
    }, [countdown]);

    const timerColor = getTimerColor(variant);
    const timerIcon = icon || getTimerIcon(variant);
    const displayText = text ?? t('general.timeout.expired');

    return (
      <div className={cnTw('mr-0.5 flex items-center gap-x-1', timerColor)}>
        <Icon name={timerIcon} size={16} className="text-inherit" />
        <FootnoteText className={`${textColor}`}>
          {countdown > 0 ? (
            <Duration seconds={countdown} shortFormat={shortDateFormat} />
          ) : hideIconText ? null : (
            <span data-testid="ExpiredMsg">{displayText}</span>
          )}
        </FootnoteText>
      </div>
    );
  },
);
