import { formatSectionAndMethod, isValidContactName, sanitizeContactName, splitCamelCaseString } from '../strings';

describe('sanitizeContactName', () => {
  it('returns regular name unchanged', () => {
    expect(sanitizeContactName('Alice')).toBe('Alice');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeContactName('  Alice  ')).toBe('Alice');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeContactName('')).toBe('');
  });

  it('removes zero-width space \\u200B', () => {
    expect(sanitizeContactName('Alice\u200BBob')).toBe('AliceBob');
  });

  it('removes zero-width non-joiner \\u200C', () => {
    expect(sanitizeContactName('Alice\u200CBob')).toBe('AliceBob');
  });

  it('removes zero-width joiner \\u200D', () => {
    expect(sanitizeContactName('Alice\u200DBob')).toBe('AliceBob');
  });

  it('removes word joiner \\u2060', () => {
    expect(sanitizeContactName('Alice\u2060Bob')).toBe('AliceBob');
  });

  it('removes BOM \\uFEFF prepended to name', () => {
    expect(sanitizeContactName('\uFEFFAlice')).toBe('Alice');
  });

  it('removes soft hyphen \\u00AD', () => {
    expect(sanitizeContactName('Alice\u00ADBob')).toBe('AliceBob');
  });

  it('removes Mongolian vowel separator \\u180E', () => {
    expect(sanitizeContactName('Alice\u180EBob')).toBe('AliceBob');
  });

  it('removes directional formatting character \\u202A (left-to-right embedding)', () => {
    expect(sanitizeContactName('\u202AAlice\u202C')).toBe('Alice');
  });

  it('removes right-to-left override \\u202E', () => {
    expect(sanitizeContactName('\u202EAlice')).toBe('Alice');
  });

  it('removes directional isolate characters \\u2066-\\u2069', () => {
    expect(sanitizeContactName('\u2066Alice\u2069')).toBe('Alice');
  });

  it('returns empty string for name composed entirely of invisible characters', () => {
    expect(sanitizeContactName('\u200B\u200C\uFEFF\u2060')).toBe('');
  });

  it('normalizes NFD to NFC (e + combining accent → é)', () => {
    const nfd = 'e\u0301'; // e + combining acute accent = 2 codepoints
    const nfc = '\u00E9'; // é as single codepoint
    expect(sanitizeContactName(nfd)).toBe(nfc);
    expect(sanitizeContactName(nfd).length).toBe(1);
  });

  it('combines trim, invisible char removal, and NFC normalization', () => {
    const name = '  \uFEFFe\u0301\u200Btest  ';
    expect(sanitizeContactName(name)).toBe('\u00E9test');
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
