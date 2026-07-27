const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export type UnbondingCountdown = {
  days: number;
  hours: number;
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
    return { days: 0, hours: 0, unlockAtMs: unlockEstimateMs, elapsed: true };
  }

  return {
    days: Math.floor(remaining / MS_PER_DAY),
    hours: Math.floor((remaining % MS_PER_DAY) / MS_PER_HOUR),
    unlockAtMs: unlockEstimateMs,
    elapsed: false,
  };
}
