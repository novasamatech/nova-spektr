import { addLeadingZero } from '@/shared/lib/utils';

import { DurationFormat } from './types';

export const timeUtils = {
  secondsToDuration,
  getDurationFormat,
  getDurationParams,
};

type Duration = {
  days: number;
  hours: number;
  minutes: string;
  seconds: string;
};

function secondsToDuration(seconds: number): Duration {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return {
    days,
    hours,
    minutes: addLeadingZero(minutes),
    seconds: addLeadingZero(Math.round(remainingSeconds)),
  };
}

function getDurationFormat({ days, hours, minutes, seconds }: Duration): DurationFormat {
  if (days && hours) {
    return DurationFormat.DAYS_HOURS;
  }

  if (days) {
    return DurationFormat.DAYS;
  }

  if (hours && minutes === '00' && seconds === '00') {
    return DurationFormat.HOURS;
  }

  if (hours) {
    return DurationFormat.HOURS_MINUTES_SECONDS;
  }

  return DurationFormat.MINUTES_SECONDS;
}

function getDurationParams(
  { days, hours, minutes, seconds }: Duration,
  format: DurationFormat,
): Record<string, string | number> {
  const formatHandlers: Record<DurationFormat, () => Record<string, string | number>> = {
    [DurationFormat.DAYS]: () => ({ count: days }),
    [DurationFormat.DAYS_HOURS]: () => ({ count: days }),
    [DurationFormat.HOURS]: () => ({ count: hours }),
    [DurationFormat.HOURS_MINUTES_SECONDS]: () => ({ hours, minutes, seconds }),
    [DurationFormat.MINUTES_SECONDS]: () => ({ minutes, seconds }),
  };

  return formatHandlers[format] ? formatHandlers[format]() : {};
}
