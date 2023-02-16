export const addLeadingZero = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

export const secondsToMinutes = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = addLeadingZero(seconds % 60);

  return `${minutes}:${remainingSeconds}`;
};

export type Duration = {
  days: number;
  hours: number;
  minutes: string;
  seconds: string;
};

export const enum DurationFormat {
  DAYS = 'days',
  DAYS_HOURS = 'daysHours',
  HOURS = 'hours',
  HOURS_MINUTES_SECONDS = 'hoursMinutesSeconds',
  MINUTES_SECONDS = 'minutesSeconds',
}

export const secondsToDuration = (seconds: number): Duration => {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return {
    days,
    hours,
    minutes: addLeadingZero(minutes),
    seconds: addLeadingZero(remainingSeconds),
  };
};

export const getDurationFormat = ({ days, hours, minutes, seconds }: Duration): DurationFormat => {
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
};

export const getDurationParams = (
  { days, hours, minutes, seconds }: Duration,
  format: DurationFormat,
): Record<string, string | number> => {
  switch (format) {
    case DurationFormat.DAYS:
      return { count: days };
    case DurationFormat.DAYS_HOURS:
      return { count: days };
    case DurationFormat.HOURS:
      return { count: hours };
    case DurationFormat.HOURS_MINUTES_SECONDS:
      return { hours, minutes, seconds };
    case DurationFormat.MINUTES_SECONDS:
      return { minutes, seconds };
    default:
      return {};
  }
};
