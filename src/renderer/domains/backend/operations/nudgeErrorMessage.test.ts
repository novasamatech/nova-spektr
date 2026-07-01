import { type TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { HttpError } from '../contacts/service';

import { nudgeErrorMessage } from './nudgeErrorMessage';

// Records key + interpolation values so assertions can inspect both.
const t = ((key: string, opts?: Record<string, unknown>) =>
  opts ? `${key}::${JSON.stringify(opts)}` : key) as unknown as TFunction;

describe('nudgeErrorMessage', () => {
  it('maps 403 to the forbidden message', () => {
    expect(nudgeErrorMessage(new HttpError(403, 'x'), t)).toBe('operation.notifySigners.errorForbidden');
  });

  it('maps 404 to the not-available message', () => {
    expect(nudgeErrorMessage(new HttpError(404, 'x'), t)).toBe('operation.notifySigners.errorNotAvailable');
  });

  it('maps 429 with a timestamp to the rate-limited message including the time', () => {
    const error = new HttpError(
      429,
      '{"message":"Nudge rate limit reached. Next nudge allowed at 2026-07-01T10:00:00.000Z"}',
    );

    const message = nudgeErrorMessage(error, t);

    expect(message).toContain('operation.notifySigners.errorRateLimited');
    expect(message).toContain('time');
    // July 1 is safe across timezones, so the year is stable. Avoid asserting the full
    // toLocaleString() output, which is locale/timezone-dependent and would be flaky in CI.
    expect(message).toContain('2026');
  });

  it('maps 429 without a parseable timestamp to the generic rate-limited message', () => {
    expect(nudgeErrorMessage(new HttpError(429, 'nope'), t)).toBe('operation.notifySigners.errorRateLimitedNoTime');
  });

  it('maps 429 with an ISO-shaped but invalid date to the generic rate-limited message', () => {
    const error = new HttpError(429, '{"message":"Next nudge allowed at 2026-13-45T99:99:99.999Z"}');

    expect(nudgeErrorMessage(error, t)).toBe('operation.notifySigners.errorRateLimitedNoTime');
  });

  it('falls back to the error message for an HttpError with an unmapped status', () => {
    expect(nudgeErrorMessage(new HttpError(500, 'boom'), t)).toContain('Request failed with status 500');
  });

  it('falls back to the error message for anything else', () => {
    expect(nudgeErrorMessage(new Error('boom'), t)).toBe('boom');
  });

  it('stringifies a non-Error thrown value', () => {
    expect(nudgeErrorMessage('plain string', t)).toBe('plain string');
  });
});
