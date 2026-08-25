/**
 * How far back the drill-down looks, in completed eras before the active one.
 * Eras are the honest unit — a Polkadot era is a day, a Kusama era six hours,
 * so "30 days" would mean a different number of election rounds per chain.
 */
export const ERA_RANGE_PRESETS = ['7', '14', '30', 'max'] as const;

export type EraRangePreset = (typeof ERA_RANGE_PRESETS)[number];

export const DEFAULT_ERA_RANGE: EraRangePreset = '7';

/**
 * Completed eras a preset asks for. `max` is everything the chain still holds:
 * `historyDepth` counts the active era, so one less than it is readable behind
 * it. Every preset is clamped to that — a "30 eras" pick on a chain keeping 20
 * reads 19, never errors on the missing ones.
 */
export function resolveEraDepth(preset: EraRangePreset, historyDepth: number | null): number {
  const available = historyDepth === null ? Number.POSITIVE_INFINITY : Math.max(historyDepth - 1, 0);
  if (preset === 'max') return historyDepth === null ? 0 : available;

  return Math.min(Number(preset), available);
}

/** What the x axis is labelled with. */
export const AXIS_MODES = ['eras', 'timeline'] as const;

export type AxisMode = (typeof AXIS_MODES)[number];

export const DEFAULT_AXIS_MODE: AxisMode = 'eras';
