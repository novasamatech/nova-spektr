import { describe, expect, it } from 'vitest';

import { buildSignMessage } from './sign-message';

const NONCE = `0x${'ab'.repeat(32)}`;

describe('buildSignMessage', () => {
  it('builds the v2 message with the configured backend origin', () => {
    expect(buildSignMessage({ backendUrl: 'https://AB.example.com:8443/api/', nonce: NONCE })).toBe(
      `<Bytes>ADDRESS_BOOK_AUTH v2\norigin: https://ab.example.com:8443\nnonce: ${NONCE}</Bytes>`,
    );
  });

  it.each([
    ['https://ab.example.com', 'https://ab.example.com'],
    ['https://ab.example.com/', 'https://ab.example.com'],
    ['https://ab.example.com:443/v1', 'https://ab.example.com'],
    ['http://localhost:3000/api', 'http://localhost:3000'],
  ])('always names the origin of %s in the message', (backendUrl, origin) => {
    const message = buildSignMessage({ backendUrl, nonce: NONCE });

    expect(message).toBe(`<Bytes>ADDRESS_BOOK_AUTH v2\norigin: ${origin}\nnonce: ${NONCE}</Bytes>`);
    // The format without an origin is `ADDRESS_BOOK_AUTH:<nonce>` — it is never produced.
    expect(message).not.toContain(`ADDRESS_BOOK_AUTH:`);
  });

  it('takes no message version: there is no other format to select', () => {
    // @ts-expect-error a version is not a parameter of the message
    const message = buildSignMessage({ backendUrl: 'https://ab.example.com', nonce: NONCE, messageVersion: 1 });

    expect(message).toBe(`<Bytes>ADDRESS_BOOK_AUTH v2\norigin: https://ab.example.com\nnonce: ${NONCE}</Bytes>`);
  });
});
