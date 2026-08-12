import { deriveEraDateMs } from '../era';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_ERA = 2260;
const ACTIVE_START = Date.UTC(2026, 7, 12, 8, 30);

describe('deriveEraDateMs', () => {
  test('should walk back one era length per era for day-long eras', () => {
    const timeline = { startMs: ACTIVE_START, eraDurationMs: DAY_MS };

    expect(deriveEraDateMs(timeline, ACTIVE_ERA, ACTIVE_ERA)).toBe(ACTIVE_START);
    expect(deriveEraDateMs(timeline, ACTIVE_ERA, ACTIVE_ERA - 1)).toBe(ACTIVE_START - DAY_MS);
    expect(deriveEraDateMs(timeline, ACTIVE_ERA, ACTIVE_ERA - 7)).toBe(ACTIVE_START - 7 * DAY_MS);
  });

  test('should refuse a date for sub-day eras — several eras share one date', () => {
    const kusama = { startMs: ACTIVE_START, eraDurationMs: DAY_MS / 4 };

    expect(deriveEraDateMs(kusama, ACTIVE_ERA, ACTIVE_ERA - 1)).toBeNull();
  });

  test('should refuse a date without a timeline', () => {
    expect(deriveEraDateMs(null, ACTIVE_ERA, ACTIVE_ERA)).toBeNull();
  });
});
