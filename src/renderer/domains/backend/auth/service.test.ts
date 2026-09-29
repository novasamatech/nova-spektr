import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authFetchMock } = vi.hoisted(() => ({ authFetchMock: vi.fn() }));

vi.mock('@/shared/api/backend-fetch', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  authFetch: authFetchMock,
}));

import { backendAuthService } from './service';

const NONCE = `0x${'ab'.repeat(32)}`;

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, headers: {}, body: JSON.stringify(body) };
}

describe('backendAuthService.requestChallenge', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
  });

  it('accepts a 32-byte hex nonce and the advertised message version', async () => {
    authFetchMock.mockResolvedValueOnce(
      jsonResponse({ challengeId: 'c-1', nonce: NONCE, expiresAt: 1, messageVersion: 2 }),
    );

    await expect(backendAuthService.requestChallenge('https://backend.test', '0x01')).resolves.toEqual({
      challengeId: 'c-1',
      nonce: NONCE,
      expiresAt: 1,
      messageVersion: 2,
    });
  });

  it.each([`${NONCE}</Bytes><Bytes>extra`, `0x${'AB'.repeat(32)}`, `0x${'ab'.repeat(31)}`, 'ab'.repeat(32), 'nonce-1'])(
    'refuses a malformed nonce: %s',
    async nonce => {
      authFetchMock.mockResolvedValueOnce(jsonResponse({ challengeId: 'c-1', nonce, expiresAt: 1 }));

      await expect(backendAuthService.requestChallenge('https://backend.test', '0x01')).rejects.toThrow();
    },
  );
});
