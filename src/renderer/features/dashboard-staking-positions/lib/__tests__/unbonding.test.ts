import { describe, expect, it } from 'vitest';

import { getCountdownParts, getUnbondingCountdown } from '../unbonding';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const NOW = Date.UTC(2026, 6, 22, 12, 0, 0);

describe('getUnbondingCountdown', () => {
  it('splits the remaining time into whole days and hours', () => {
    const countdown = getUnbondingCountdown(NOW + 12 * DAY + 4 * HOUR, NOW);

    expect(countdown).toMatchObject({ days: 12, hours: 4, elapsed: false });
  });

  it('truncates rather than rounds — 4h59m is still 4h', () => {
    const countdown = getUnbondingCountdown(NOW + 12 * DAY + 4 * HOUR + 59 * 60 * 1000, NOW);

    expect(countdown).toMatchObject({ days: 12, hours: 4 });
  });

  it('reports hours only inside the last day', () => {
    expect(getUnbondingCountdown(NOW + 3 * HOUR, NOW)).toMatchObject({ days: 0, hours: 3 });
  });

  it('keeps the unlock moment so the date can be rendered next to it', () => {
    const unlockAt = NOW + 12 * DAY + 4 * HOUR;

    expect(getUnbondingCountdown(unlockAt, NOW)?.unlockAtMs).toEqual(unlockAt);
  });

  it('marks a passed estimate as elapsed instead of counting backwards', () => {
    expect(getUnbondingCountdown(NOW - HOUR, NOW)).toMatchObject({ days: 0, hours: 0, elapsed: true });
    expect(getUnbondingCountdown(NOW, NOW)).toMatchObject({ elapsed: true });
  });

  it('is null without an era anchor, so the caller falls back to eras', () => {
    expect(getUnbondingCountdown(null, NOW)).toBeNull();
  });

  it('reports minutes under the hour', () => {
    expect(getUnbondingCountdown(NOW + 43 * MINUTE, NOW)).toMatchObject({ days: 0, hours: 0, minutes: 43 });
    expect(getUnbondingCountdown(NOW + 3 * HOUR + 7 * MINUTE, NOW)).toMatchObject({ hours: 3, minutes: 7 });
  });

  it('never floors a live countdown to zero minutes', () => {
    // `0m` reads as done on a chunk that is not; the last minute is still a wait.
    expect(getUnbondingCountdown(NOW + 20 * 1000, NOW)).toMatchObject({ minutes: 1, elapsed: false });
    expect(getUnbondingCountdown(NOW + 1, NOW)).toMatchObject({ minutes: 1, elapsed: false });
  });
});

describe('getCountdownParts', () => {
  const partsAt = (remaining: number) => getCountdownParts(getUnbondingCountdown(NOW + remaining, NOW)!);

  it('renders days and hours while a day is left', () => {
    expect(partsAt(12 * DAY + 4 * HOUR)).toEqual({ unit: 'daysHours', days: 12, hours: 4 });
  });

  it('drops the day once it is zero and shows minutes instead', () => {
    expect(partsAt(3 * HOUR + 7 * MINUTE)).toEqual({ unit: 'hoursMinutes', hours: 3, minutes: 7 });
  });

  it('shows minutes alone in the last hour — the case `0d 0h` said nothing about', () => {
    expect(partsAt(43 * MINUTE)).toEqual({ unit: 'minutes', minutes: 43 });
    expect(partsAt(30 * 1000)).toEqual({ unit: 'minutes', minutes: 1 });
  });

  it('leaves a zero minute alone when an hour is still carrying it', () => {
    expect(partsAt(5 * HOUR)).toEqual({ unit: 'hoursMinutes', hours: 5, minutes: 0 });
  });
});
