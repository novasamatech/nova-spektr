// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { isAllowedProxyOrigin, isAllowedProxyUrl, isLoopbackHostname } from './proxyUrl';

const ORIGIN = 'https://address-book.example.com';

describe('isLoopbackHostname', () => {
  // `URL.hostname` keeps the brackets for IPv6 literals (`[::1]`), so the bare `::1` is not a match.
  it.each(['localhost', '127.0.0.1', '[::1]', 'LOCALHOST'])('accepts %s', (host) => {
    expect(isLoopbackHostname(host)).toBe(true);
  });

  it.each(['example.com', '127.0.0.2', '10.0.0.1', 'localhost.evil.com', '::1'])('rejects %s', (host) => {
    expect(isLoopbackHostname(host)).toBe(false);
  });
});

describe('isAllowedProxyUrl', () => {
  it('allows https to the pinned origin', () => {
    expect(isAllowedProxyUrl(`${ORIGIN}/health`, ORIGIN)).toBe(true);
  });

  it('allows an uppercase scheme (URL normalises it)', () => {
    expect(isAllowedProxyUrl('HTTPS://address-book.example.com/health', ORIGIN)).toBe(true);
  });

  it('denies everything when no origin is pinned (fail closed)', () => {
    expect(isAllowedProxyUrl(`${ORIGIN}/health`, null)).toBe(false);
    expect(isAllowedProxyUrl('http://localhost:5000/health', null)).toBe(false);
  });

  it.each([
    'file:///etc/passwd',
    'data:text/plain,hello',
    'blob:https://address-book.example.com/uuid',
    'ftp://address-book.example.com/x',
    'javascript:alert(1)',
  ])('rejects non-http(s) scheme: %s', (url) => {
    expect(isAllowedProxyUrl(url, ORIGIN)).toBe(false);
  });

  it('rejects https to a different origin', () => {
    expect(isAllowedProxyUrl('https://evil.example.com/exfil', ORIGIN)).toBe(false);
  });

  it('rejects a port mismatch against the pinned origin', () => {
    expect(isAllowedProxyUrl('https://address-book.example.com:8443/health', ORIGIN)).toBe(false);
  });

  it('rejects userinfo tricks that only look like the pinned host', () => {
    expect(isAllowedProxyUrl('https://address-book.example.com@evil.example.com/', ORIGIN)).toBe(false);
  });

  it('allows http to a loopback host only when it is the pinned origin', () => {
    expect(isAllowedProxyUrl('http://localhost:5000/health', 'http://localhost:5000')).toBe(true);
    expect(isAllowedProxyUrl('http://127.0.0.1:5000/health', 'http://127.0.0.1:5000')).toBe(true);
    expect(isAllowedProxyUrl('http://[::1]:5000/health', 'http://[::1]:5000')).toBe(true);
    expect(isAllowedProxyUrl('http://localhost:5000/health', 'http://localhost:6000')).toBe(false);
    expect(isAllowedProxyUrl('http://localhost:5000/health', ORIGIN)).toBe(false);
  });

  it('rejects plaintext http to a non-loopback host even when pinned', () => {
    expect(isAllowedProxyUrl('http://address-book.example.com/health', 'http://address-book.example.com')).toBe(false);
  });

  it('rejects unparsable input', () => {
    expect(isAllowedProxyUrl('not a url', ORIGIN)).toBe(false);
    expect(isAllowedProxyUrl('', ORIGIN)).toBe(false);
  });
});

describe('isAllowedProxyOrigin', () => {
  it.each([ORIGIN, 'http://localhost:5000', 'http://[::1]:5000'])('accepts %s', (origin) => {
    expect(isAllowedProxyOrigin(origin)).toBe(true);
  });

  it.each(['http://address-book.example.com', 'file://', 'ftp://localhost', `${ORIGIN}/api`, 'nope'])(
    'rejects %s',
    (origin) => {
      expect(isAllowedProxyOrigin(origin)).toBe(false);
    },
  );
});
