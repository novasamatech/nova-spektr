// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { isAllowedExternalUrl } from './externalUrl';

describe('isAllowedExternalUrl', () => {
  it.each(['https://example.com', 'http://example.com/path?q=1', 'mailto:alice@example.com'])('allows %s', (url) => {
    expect(isAllowedExternalUrl(url)).toBe(true);
  });

  it.each([
    'file:///etc/passwd',
    'smb://attacker/share',
    'search-ms:query=foo',
    'vscode://open?url=x',
    'javascript:alert(1)',
    'ftp://example.com',
    'ssh://example.com',
  ])('rejects %s', (url) => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });

  it('rejects unparsable input', () => {
    expect(isAllowedExternalUrl('not a url')).toBe(false);
    expect(isAllowedExternalUrl('')).toBe(false);
  });

  it('is case-insensitive on the scheme', () => {
    expect(isAllowedExternalUrl('HTTPS://example.com')).toBe(true);
  });
});
