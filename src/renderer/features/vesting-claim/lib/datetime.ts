const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * How close an unlock has to be before we print a clock time for it.
 *
 * Every date here is a projection: `now + blocks × expectedBlockTime`. Over the
 * next day or two that is accurate to the minute and the user genuinely wants
 * the hour — "today" is not an answer when the question is whether to wait.
 * Months out, the same projection is worth a day at best (blocks slip, chains
 * stall), and "14:32" would be a precision we do not have.
 */
const CLOCK_TIME_WITHIN_MS = 2 * DAY_MS;

type Translate = (key: string, values?: Record<string, unknown>) => string;

/**
 * "13 Jul 2026", or "13 Jul 2026, 15:04" when the moment is near enough for the
 * projection to mean it — see {@link CLOCK_TIME_WITHIN_MS}.
 */
export const formatUnlockDate = (date: Date, now: number): string => {
  const isNear = date.getTime() - now < CLOCK_TIME_WITHIN_MS;
  const time = isNear ? ({ hour: '2-digit', minute: '2-digit' } as const) : {};

  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', ...time });
};

/**
 * How long until `date`, at the coarsest useful resolution: "3d 4h", "5h 20m",
 * "12m". `null` once the moment has passed — the caller drops the countdown
 * rather than print a stale or negative one. The block height it was projected
 * from is only refreshed once a minute, so a schedule can come due a little
 * before the app notices.
 */
export const formatTimeLeft = (date: Date, now: number, t: Translate): string | null => {
  const remaining = date.getTime() - now;
  if (remaining <= 0) return null;

  const minutes = Math.floor(remaining / MINUTE_MS);
  if (minutes < 1) return t('vesting.duration.lessThanMinute');
  if (minutes < 60) return t('vesting.duration.minutes', { minutes });

  const hours = Math.floor(remaining / HOUR_MS);
  if (hours < 24) {
    const restMinutes = minutes - hours * 60;

    return restMinutes > 0
      ? t('vesting.duration.hoursMinutes', { hours, minutes: restMinutes })
      : t('vesting.duration.hours', { hours });
  }

  const days = Math.floor(remaining / DAY_MS);
  const restHours = hours - days * 24;

  // Past a week the hours are noise — and beyond the projection's accuracy.
  return restHours > 0 && days < 7
    ? t('vesting.duration.daysHours', { days, hours: restHours })
    : t('vesting.duration.days', { days });
};

/**
 * A date with its countdown — "13 Jul 2026, 15:04 · in 2h 10m" — or the bare
 * date once the moment has passed.
 */
export const formatUnlockMoment = (date: Date, now: number, t: Translate): string => {
  const formatted = formatUnlockDate(date, now);
  const left = formatTimeLeft(date, now, t);

  return left ? t('vesting.duration.dateIn', { date: formatted, left }) : formatted;
};
