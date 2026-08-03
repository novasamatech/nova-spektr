import { describe, expect, it } from 'vitest';

import { SCORE_FAIR, SCORE_GOOD, getScoreTone, toScoreOutOfTen } from '../score';

describe('toScoreOutOfTen', () => {
  it('maps the 0..1 range onto 0..10', () => {
    expect(toScoreOutOfTen(0)).toBe(0);
    expect(toScoreOutOfTen(0.7)).toBe(7);
    expect(toScoreOutOfTen(1)).toBe(10);
  });

  it('rounds to the nearest step rather than truncating', () => {
    expect(toScoreOutOfTen(0.74)).toBe(7);
    expect(toScoreOutOfTen(0.75)).toBe(8);
  });

  it('clamps a value outside the range instead of rendering an 11', () => {
    expect(toScoreOutOfTen(1.4)).toBe(10);
    expect(toScoreOutOfTen(-0.2)).toBe(0);
  });
});

describe('getScoreTone', () => {
  it('is green from the good threshold up', () => {
    expect(getScoreTone(SCORE_GOOD)).toBe('positive');
    expect(getScoreTone(10)).toBe('positive');
  });

  it('is amber between the two thresholds', () => {
    expect(getScoreTone(SCORE_FAIR)).toBe('warning');
    expect(getScoreTone(SCORE_GOOD - 1)).toBe('warning');
  });

  it('is grey below the fair threshold — a weak score is not a danger', () => {
    // Red is reserved for the things that actually cost money: a slash, a
    // blocked validator. Those carry their own badge.
    expect(getScoreTone(SCORE_FAIR - 1)).toBe('neutral');
    expect(getScoreTone(0)).toBe('neutral');
  });
});
