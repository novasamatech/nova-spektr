// @vitest-environment node

import { CAMERA_SETTINGS_URL } from '~shared/security/externalUrlPolicy';
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
    'data:text/html,<script>alert(1)</script>',
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

  describe('first-party OS deep links', () => {
    it.each(Object.values(CAMERA_SETTINGS_URL))('allows the exact url %s', (url) => {
      expect(isAllowedExternalUrl(url)).toBe(true);
    });

    it.each([
      'ms-settings:privacy-microphone',
      'ms-settings:',
      'ms-settings:privacy-webcam?x=1',
      'x-apple.systempreferences:com.apple.preference.security',
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera&x=1',
      'x-apple.systempreferences:com.apple.preference.network',
    ])('rejects other payloads on the same scheme: %s', (url) => {
      expect(isAllowedExternalUrl(url)).toBe(false);
    });

    it('does not match case variants or surrounding whitespace', () => {
      expect(isAllowedExternalUrl('MS-SETTINGS:privacy-webcam')).toBe(false);
      expect(isAllowedExternalUrl(' ms-settings:privacy-webcam')).toBe(false);
    });
  });
});
