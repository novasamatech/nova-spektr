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
  });

  it('maps 429 without a parseable timestamp to the generic rate-limited message', () => {
    expect(nudgeErrorMessage(new HttpError(429, 'nope'), t)).toBe('operation.notifySigners.errorRateLimitedNoTime');
  });

  it('falls back to the error message for anything else', () => {
    expect(nudgeErrorMessage(new Error('boom'), t)).toBe('boom');
  });
});
