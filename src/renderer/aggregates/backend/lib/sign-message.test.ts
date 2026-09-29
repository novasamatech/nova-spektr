import { describe, expect, it } from 'vitest';

import { buildSignMessage } from './sign-message';

const NONCE = `0x${'ab'.repeat(32)}`;

describe('buildSignMessage', () => {
  it('builds the v2 message with the configured backend origin', () => {
    expect(buildSignMessage({ backendUrl: 'https://AB.example.com:8443/api/', nonce: NONCE, messageVersion: 2 })).toBe(
      `<Bytes>ADDRESS_BOOK_AUTH v2\norigin: https://ab.example.com:8443\nnonce: ${NONCE}</Bytes>`,
    );
  });

  it('falls back to the v1 message when the backend does not advertise v2', () => {
    expect(buildSignMessage({ backendUrl: 'https://ab.example.com', nonce: NONCE })).toBe(
      `<Bytes>ADDRESS_BOOK_AUTH:${NONCE}</Bytes>`,
    );
    expect(buildSignMessage({ backendUrl: 'https://ab.example.com', nonce: NONCE, messageVersion: 1 })).toBe(
      `<Bytes>ADDRESS_BOOK_AUTH:${NONCE}</Bytes>`,
    );
  });
});
