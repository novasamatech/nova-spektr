import { formatSectionAndMethod, isValidContactName, sanitizeDisplayName, splitCamelCaseString } from '../strings';

describe('sanitizeDisplayName', () => {
  it('returns regular name unchanged', () => {
    expect(sanitizeDisplayName('Alice')).toBe('Alice');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeDisplayName('  Alice  ')).toBe('Alice');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeDisplayName('')).toBe('');
  });

  it('removes zero-width space \\u200B', () => {
    expect(sanitizeDisplayName('Alice\u200BBob')).toBe('AliceBob');
  });

  it('removes zero-width non-joiner \\u200C', () => {
    expect(sanitizeDisplayName('Alice\u200CBob')).toBe('AliceBob');
  });

  it('removes zero-width joiner \\u200D', () => {
    expect(sanitizeDisplayName('Alice\u200DBob')).toBe('AliceBob');
  });

  it('removes word joiner \\u2060', () => {
    expect(sanitizeDisplayName('Alice\u2060Bob')).toBe('AliceBob');
  });

  it('removes BOM \\uFEFF prepended to name', () => {
    expect(sanitizeDisplayName('\uFEFFAlice')).toBe('Alice');
  });

  it('removes soft hyphen \\u00AD', () => {
    expect(sanitizeDisplayName('Alice\u00ADBob')).toBe('AliceBob');
  });

  it('removes Mongolian vowel separator \\u180E', () => {
    expect(sanitizeDisplayName('Alice\u180EBob')).toBe('AliceBob');
  });

  it('removes directional formatting character \\u202A (left-to-right embedding)', () => {
    expect(sanitizeDisplayName('\u202AAlice\u202C')).toBe('Alice');
  });

  it('removes right-to-left override \\u202E', () => {
    expect(sanitizeDisplayName('\u202EAlice')).toBe('Alice');
  });

  it('removes directional isolate characters \\u2066-\\u2069', () => {
    expect(sanitizeDisplayName('\u2066Alice\u2069')).toBe('Alice');
  });

  it('returns empty string for name composed entirely of invisible characters', () => {
    expect(sanitizeDisplayName('\u200B\u200C\uFEFF\u2060')).toBe('');
  });

  it('normalizes NFD to NFC (e + combining accent → é)', () => {
    const nfd = 'e\u0301'; // e + combining acute accent = 2 codepoints
    const nfc = '\u00E9'; // é as single codepoint
    expect(sanitizeDisplayName(nfd)).toBe(nfc);
    expect(sanitizeDisplayName(nfd).length).toBe(1);
  });

  it('combines trim, invisible char removal, and NFC normalization', () => {
    const name = '  \uFEFFe\u0301\u200Btest  ';
    expect(sanitizeDisplayName(name)).toBe('\u00E9test');
  });

  it('replaces line breaks, tabs and other control characters with a space', () => {
    expect(sanitizeDisplayName('Alice\nBob')).toBe('Alice Bob');
    expect(sanitizeDisplayName('Alice\r\tBob')).toBe('Alice  Bob');
    expect(sanitizeDisplayName('Alice\u0000Bob')).toBe('Alice Bob');
    expect(sanitizeDisplayName('Alice\u0085Bob')).toBe('Alice Bob');
  });

  it('replaces line and paragraph separators with a space', () => {
    expect(sanitizeDisplayName('Alice\u2028Bob\u2029')).toBe('Alice Bob');
  });

  it('keeps regular names in other scripts and emoji unchanged', () => {
    expect(sanitizeDisplayName('Алиса 🚀')).toBe('Алиса 🚀');
    expect(sanitizeDisplayName('日本語 name')).toBe('日本語 name');
  });
});

describe('isValidContactName', () => {
  it('returns true for regular name', () => {
    expect(isValidContactName('Alice')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidContactName('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(isValidContactName('   ')).toBe(false);
  });

  it('returns false for invisible-characters-only string', () => {
    expect(isValidContactName('\u200B\uFEFF\u200C')).toBe(false);
  });

  it('returns true for name that has visible content after sanitization', () => {
    expect(isValidContactName('  \uFEFFAlice\u200B  ')).toBe(true);
  });
});

describe('shared/lib/onChainUtils/strings', () => {
  describe('formatSectionAndMethod', () => {
    test('should make capital and add :', () => {
      expect(formatSectionAndMethod('system', 'remark')).toEqual('System: Remark');
    });

    test('split camel case for method', () => {
      expect(formatSectionAndMethod('proxy', 'addProxy')).toEqual('Proxy: Add proxy');
    });

    test('split camel case for section and method', () => {
      expect(formatSectionAndMethod('simpleProxy', 'addProxy')).toEqual('Simple proxy: Add proxy');
    });

    test('split camel case string into parts divided by space', () => {
      expect(splitCamelCaseString('SudoBalances')).toEqual('Sudo Balances');
    });
  });
});
