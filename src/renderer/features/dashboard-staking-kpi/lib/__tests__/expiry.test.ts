import { DEFAULT_CLAIM_WINDOW_ERAS, daysUntilExpiry, erasUntilExpiry, oldestPayoutEra } from '../expiry';

describe('claim window', () => {
  test('a payout from the current era has the whole window left', () => {
    expect(erasUntilExpiry(1000, 1000)).toBe(DEFAULT_CLAIM_WINDOW_ERAS + 1);
  });

  test('the window shrinks era by era', () => {
    expect(erasUntilExpiry(1000, 1010)).toBe(DEFAULT_CLAIM_WINDOW_ERAS - 9);
  });

  test('the oldest still-claimable era has one era left, not zero', () => {
    // The scan runs over [activeEra - historyDepth, activeEra - 1] inclusive, so
    // era E is still claimable at activeEra === E + historyDepth.
    expect(erasUntilExpiry(1000, 1000 + DEFAULT_CLAIM_WINDOW_ERAS)).toBe(1);
    expect(erasUntilExpiry(1000, 1000 + DEFAULT_CLAIM_WINDOW_ERAS + 1)).toBe(0);
  });

  test('honours the runtime history depth over the default', () => {
    expect(erasUntilExpiry(1000, 1010, 30)).toBe(21);
  });

  test('an expired payout never reports negative eras', () => {
    expect(erasUntilExpiry(1000, 1200)).toBe(0);
  });
});

describe('days until expiry', () => {
  test('uses the chain era duration', () => {
    // half-day eras: 10 eras are 5 days
    expect(daysUntilExpiry(10, 12 * 60 * 60 * 1000)).toBe(5);
  });

  test('is null when the duration is unknown, rather than guessing a day per era', () => {
    // Kusama runs 6-hour eras: guessing would report a reward that expires in
    // three weeks as 84 days away.
    expect(daysUntilExpiry(14, null)).toBeNull();
    expect(daysUntilExpiry(14, 0)).toBeNull();
  });

  test('never goes negative', () => {
    expect(daysUntilExpiry(0, 24 * 60 * 60 * 1000)).toBe(0);
  });
});

describe('oldest payout era', () => {
  test('is the smallest era present', () => {
    expect(oldestPayoutEra([1500, 1490, 1502])).toBe(1490);
  });

  test('is null when nothing is unclaimed', () => {
    expect(oldestPayoutEra([])).toBeNull();
  });
});
