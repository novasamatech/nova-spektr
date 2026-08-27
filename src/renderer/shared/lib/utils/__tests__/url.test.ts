import { toWebUrl } from '../url';

describe('toWebUrl', () => {
  it('keeps http(s) urls', () => {
    expect(toWebUrl('https://example.com')).toBe('https://example.com');
    expect(toWebUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1');
  });

  it('prefixes https:// for scheme-less values', () => {
    expect(toWebUrl('example.com')).toBe('https://example.com');
    expect(toWebUrl('www.example.com/path')).toBe('https://www.example.com/path');
  });

  it('trims whitespace', () => {
    expect(toWebUrl('  example.com  ')).toBe('https://example.com');
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
