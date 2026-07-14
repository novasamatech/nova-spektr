import { describe, expect, it } from 'vitest';

import { formatTimeLeft, formatUnlockDate, formatUnlockMoment } from './datetime';

// Stands in for i18next: echoes the key with its values, so the tests assert on
// which phrasing was picked and with what numbers, not on the English copy.
const t = (key: string, values?: Record<string, unknown>) =>
  `${key.replace('vesting.duration.', '')}(${Object.entries(values ?? {})
    .map(([name, value]) => `${name}=${value}`)
    .join(',')})`;

const NOW = new Date('2026-07-13T12:00:00Z').getTime();
const inMs = (ms: number) => new Date(NOW + ms);

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatTimeLeft', () => {
  it('counts down in minutes below the hour', () => {
    expect(formatTimeLeft(inMs(12 * MINUTE), NOW, t)).toBe('minutes(minutes=12)');
  });

  it('counts down in hours and minutes below the day — the reporter saw "in 1d" here', () => {
    expect(formatTimeLeft(inMs(3 * HOUR + 20 * MINUTE), NOW, t)).toBe('hoursMinutes(hours=3,minutes=20)');
  });

  it('drops the minutes when they are zero', () => {
    expect(formatTimeLeft(inMs(5 * HOUR), NOW, t)).toBe('hours(hours=5)');
  });

  it('adds the hours to the days for the first week', () => {
    expect(formatTimeLeft(inMs(2 * DAY + 5 * HOUR), NOW, t)).toBe('daysHours(days=2,hours=5)');
  });

  it('gives days alone past a week, where the projection cannot support the hours', () => {
    expect(formatTimeLeft(inMs(45 * DAY + 5 * HOUR), NOW, t)).toBe('days(days=45)');
  });

  it('says "less than a minute" rather than round down to zero', () => {
    expect(formatTimeLeft(inMs(30 * 1000), NOW, t)).toBe('lessThanMinute()');
  });

  it('gives nothing for a moment that has passed — the caller drops the countdown', () => {
    expect(formatTimeLeft(inMs(-1), NOW, t)).toBeNull();
    expect(formatTimeLeft(inMs(0), NOW, t)).toBeNull();
  });
});

describe('formatUnlockDate', () => {
  it('prints a clock time for an unlock that is near', () => {
    // 3h out: the projection is good to the minute, and the hour is the answer
    // the user is after when the date alone says "today".
    expect(formatUnlockDate(inMs(3 * HOUR), NOW)).toMatch(/\d{1,2}:\d{2}/);
  });

  it('prints the date alone for one that is far off', () => {
    // Months out, a block-time projection is worth a day at best — a clock time
    // would be precision we do not have.
    expect(formatUnlockDate(inMs(120 * DAY), NOW)).not.toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('formatUnlockMoment', () => {
  it('pairs the date with its countdown', () => {
    expect(formatUnlockMoment(inMs(3 * HOUR + 20 * MINUTE), NOW, t)).toContain('dateIn(');
    expect(formatUnlockMoment(inMs(3 * HOUR + 20 * MINUTE), NOW, t)).toContain('hoursMinutes(hours=3,minutes=20)');
  });

  it('falls back to the bare date once the moment has passed', () => {
    expect(formatUnlockMoment(inMs(-HOUR), NOW, t)).not.toContain('dateIn(');
  });
});
