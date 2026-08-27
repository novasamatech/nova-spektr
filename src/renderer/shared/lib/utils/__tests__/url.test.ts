import { toWebUrl } from '../url';

describe('toWebUrl', () => {
  it('returns the normalised href for http(s) urls', () => {
    expect(toWebUrl('https://example.com')).toBe('https://example.com/');
    expect(toWebUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1');
    expect(toWebUrl('HTTPS://X.COM')).toBe('https://x.com/');
  });

  it('prefixes https:// for scheme-less values', () => {
    expect(toWebUrl('example.com')).toBe('https://example.com/');
    expect(toWebUrl('www.example.com/path')).toBe('https://www.example.com/path');
  });

  it('trims whitespace', () => {
    expect(toWebUrl('  example.com  ')).toBe('https://example.com/');
  });

  it('normalises sloppy but unambiguous http(s) spellings', () => {
    // WHATWG parsing: missing or extra slashes after a special scheme collapse to the host
    expect(toWebUrl('https:evil.com')).toBe('https://evil.com/');
    expect(toWebUrl('//evil.com')).toBe('https://evil.com/');
  });

  it('rejects credentials in the authority', () => {
    expect(toWebUrl('user@x.com')).toBeNull();
    expect(toWebUrl('https://user@x.com')).toBeNull();
    expect(toWebUrl('https://user:pw@x.com')).toBeNull();
  });

  it('rejects a scheme-less host with a port (indistinguishable from a scheme)', () => {
    // `example.com:8080` parses with protocol `example.com:`, so it is treated as an unknown scheme
    expect(toWebUrl('example.com:8080')).toBeNull();
  });

  it.each(['file:///etc/passwd', 'smb://host/share', 'javascript:alert(1)', 'search-ms:query', 'vscode://x'])(
    'returns null for %s',
    (value) => {
      expect(toWebUrl(value)).toBeNull();
    },
  );

  it('returns null for empty or invalid values', () => {
    expect(toWebUrl('')).toBeNull();
    expect(toWebUrl('   ')).toBeNull();
    expect(toWebUrl('https://')).toBeNull();
  });
});
