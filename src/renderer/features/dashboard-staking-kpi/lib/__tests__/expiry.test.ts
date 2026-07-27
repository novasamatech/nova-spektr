import {
  CLAIM_WINDOW_ERAS,
  EXPIRY_LABEL_VARIANT,
  daysUntilExpiry,
  erasUntilExpiry,
  getExpiryUrgency,
  oldestPayoutEra,
} from '../expiry';

describe('expiry chip thresholds', () => {
  test.each([
    [0, 'critical'],
    [1, 'critical'],
    [13, 'critical'],
    [14, 'warning'],
    [21, 'warning'],
    [30, 'warning'],
    [31, 'safe'],
    [84, 'safe'],
  ])('%i days left is %s', (days, urgency) => {
    expect(getExpiryUrgency(days)).toBe(urgency);
  });

  test('colour bands map red / amber / green', () => {
    expect(EXPIRY_LABEL_VARIANT[getExpiryUrgency(3)]).toBe('red');
    expect(EXPIRY_LABEL_VARIANT[getExpiryUrgency(20)]).toBe('orange');
    expect(EXPIRY_LABEL_VARIANT[getExpiryUrgency(60)]).toBe('green');
  });
});

describe('claim window', () => {
  test('a payout from the current era has the whole window left', () => {
    expect(erasUntilExpiry(1000, 1000)).toBe(CLAIM_WINDOW_ERAS);
  });

  test('the window shrinks era by era', () => {
    expect(erasUntilExpiry(1000, 1010)).toBe(CLAIM_WINDOW_ERAS - 10);
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

  test('falls back to one era per day when the duration is unknown', () => {
    expect(daysUntilExpiry(14, null)).toBe(14);
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
