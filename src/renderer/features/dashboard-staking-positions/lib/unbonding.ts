const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Which of the two expiry strings a countdown renders.
 *
 * Shared so the table cell and the drawer cannot disagree about the same
 * position: the cell said "expires now" under a day while the drawer floored
 * the value and said "0d left".
 */
export function getExpiryLabelKey(expiryDays: number): 'expiring' | 'days' {
  return expiryDays < 1 ? 'expiring' : 'days';
}

export type UnbondingCountdown = {
  days: number;
  hours: number;
  minutes: number;
  /** The estimated unlock moment, unix ms — what the `→ Aug 3` part renders. */
  unlockAtMs: number;
  /** The chunk's estimate is already in the past; it unlocks at the next era. */
  elapsed: boolean;
};

/**
 * Turns a chunk's unlock estimate into the `12d 4h left → Aug 3` strip.
 *
 * `nowMs` is a parameter on purpose: the same chunk must render identically in
 * a test, in a snapshot and in the app, and a pure function that reads the wall
 * clock can promise none of that.
 *
 * `null` when the chain gave no era anchor — the caller then falls back to the
 * era count, which is the only thing actually known.
 */
export function getUnbondingCountdown(unlockEstimateMs: number | null, nowMs: number): UnbondingCountdown | null {
  if (unlockEstimateMs === null) return null;

  const remaining = unlockEstimateMs - nowMs;

  if (remaining <= 0) {
    return { days: 0, hours: 0, minutes: 0, unlockAtMs: unlockEstimateMs, elapsed: true };
  }

  const days = Math.floor(remaining / MS_PER_DAY);
  const hours = Math.floor((remaining % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((remaining % MS_PER_HOUR) / MS_PER_MINUTE);

  return {
    days,
    hours,
    // Floored like the rest, except when it is the only unit left to show: the
    // last seconds of a wait are still a wait, and a lone `0m` reads as "done"
    // on a chunk that is not. Under a larger unit a zero is just a zero.
    minutes: days === 0 && hours === 0 ? Math.max(1, minutes) : minutes,
    unlockAtMs: unlockEstimateMs,
    elapsed: false,
  };
}

/**
 * The two largest units that still carry information, and the compact-duration
 * key that renders them.
 *
 * Three units never fit the chip, and the leading zeroes are the ones worth
 * dropping: `0d 0h` told the user nothing except that the answer was somewhere
 * under an hour, which is exactly when the minutes matter most.
 */
export type CountdownParts =
  | { unit: 'daysHours'; days: number; hours: number }
  | { unit: 'hoursMinutes'; hours: number; minutes: number }
  | { unit: 'minutes'; minutes: number };

export function getCountdownParts({ days, hours, minutes }: UnbondingCountdown): CountdownParts {
  if (days > 0) return { unit: 'daysHours', days, hours };
  if (hours > 0) return { unit: 'hoursMinutes', hours, minutes };

  return { unit: 'minutes', minutes };
}
