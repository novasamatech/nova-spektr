import { useMemo } from 'react';

import { Timeout } from '@/shared/ui-kit';

const ONE_DAY = 24 * 60 * 60;

function getTimerColor(time: number): 'urgent' | 'warning' | 'idle' {
  const days = Math.floor(time / ONE_DAY);

  if (days <= 2) return 'urgent';
  if (days <= 14) return 'warning';
  return 'idle';
}

type Props = {
  endDate: number | null;
  shortDateFormat?: boolean;
};

export const PromotionEndTimer = ({ endDate, shortDateFormat }: Props) => {
  const secondsToEnd = useMemo(() => {
    if (!endDate) return null;
    const diff = Math.floor((endDate - Date.now()) / 1000);
    return Math.max(0, diff);
  }, [endDate]);

  if (secondsToEnd === null) {
    return <span />;
  }

  const variant = getTimerColor(secondsToEnd);

  return <Timeout secondsToEnd={secondsToEnd} variant={variant} shortDateFormat={shortDateFormat} />;
};
