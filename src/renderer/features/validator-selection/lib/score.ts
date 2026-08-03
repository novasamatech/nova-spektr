/**
 * The recommendation score is computed as `0..1`, but a normalised fraction is
 * not something anyone reads off a table. `7/10` is: it is coarse enough to be
 * compared at a glance and honest about how precise the underlying number
 * really is - the metrics behind it are relative to whoever happens to be
 * elected this era.
 */
export const SCORE_SCALE = 10;

export type ScoreTone = 'neutral' | 'warning' | 'positive';

/** At or above this the validator is a solid pick. */
export const SCORE_GOOD = 7;
/** Below this it is weak on most of what the recommender measures. */
export const SCORE_FAIR = 4;

export function toScoreOutOfTen(overall: number): number {
  const bounded = Math.min(Math.max(overall, 0), 1);

  return Math.round(bounded * SCORE_SCALE);
}

/**
 * Grey rather than red at the bottom of the range: a low score means "there are
 * better validators this era", not "this one is dangerous". The things that are
 * actually dangerous - a slash, a blocked validator - carry their own badge.
 */
export function getScoreTone(scoreOutOfTen: number): ScoreTone {
  if (scoreOutOfTen >= SCORE_GOOD) return 'positive';
  if (scoreOutOfTen >= SCORE_FAIR) return 'warning';

  return 'neutral';
}
