import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authFetchMock } = vi.hoisted(() => ({ authFetchMock: vi.fn() }));

vi.mock('@/shared/api/backend-fetch', () => ({ authFetch: authFetchMock }));

import { HttpError } from '../contacts/service';

import { operationsService } from './service';

describe('operationsService.nudge', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
  });

  it('POSTs to the nudge endpoint and returns the parsed result', async () => {
    authFetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {},
      body: JSON.stringify({ notified: 2, skipped: 3, failed: 1, unreachableNoMatrixId: 2 }),
    });

    const result = await operationsService.nudge('https://backend.test', 'op-1');

    expect(authFetchMock).toHaveBeenCalledWith('https://backend.test/operations/op-1/nudge', { method: 'POST' });
    expect(result).toEqual({ notified: 2, skipped: 3, failed: 1, unreachableNoMatrixId: 2 });
  });

  it('throws HttpError with the status on a failed response', async () => {
    authFetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: {},
      body: '{"message":"Nudge rate limit reached. Next nudge allowed at 2026-07-01T10:00:00.000Z"}',
    });

    await expect(operationsService.nudge('https://backend.test', 'op-1')).rejects.toBeInstanceOf(HttpError);
    await expect(operationsService.nudge('https://backend.test', 'op-1')).rejects.toHaveProperty('status', 429);
  });
});
