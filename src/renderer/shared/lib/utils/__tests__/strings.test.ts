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

  it.each([
    [
      'Persian ZWNJ kept',
      '\u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u0645',
      '\u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u0645',
    ],
    [
      'ZWJ emoji kept',
      '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67',
      '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67',
    ],
    ['Devanagari conjunct kept', '\u0915\u094D\u200D\u0937', '\u0915\u094D\u200D\u0937'],
    ['bare joiners \u2192 empty', '\u200C\u200D', ''],
    ['edge joiners trimmed', '\u200D Alice \u200C', 'Alice'],
  ])('%s', (_, input, expected) => {
    expect(sanitizeDisplayName(input)).toBe(expected);
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

const formatCodePoint = (codePoint: number) => `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
const createRange = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

const REMOVED_CODE_POINTS = [
  // Arabic letter mark
  0x061c,
  // Tag block: language tag, then the first, a middle and the last tag character
  0xe0001,
  0xe0020,
  0xe0041,
  0xe007f,
  // Soft hyphen, Mongolian vowel separator, zero width space, direction marks
  0x00ad,
  0x180e,
  0x200b,
  0x200e,
  0x200f,
  // Bidi embeddings and overrides
  ...createRange(0x202a, 0x202e),
  // Word joiner and invisible operators
  ...createRange(0x2060, 0x2064),
  // Reserved default-ignorable code point between the two ranges
  0x2065,
  // Bidi isolates and deprecated format controls
  ...createRange(0x2066, 0x206f),
  // Byte order mark
  0xfeff,
  // Fillers
  0x115f,
  0x1160,
  0x3164,
  0xffa0,
  // Combining grapheme joiner and Khmer inherent vowels
  0x034f,
  0x17b4,
  0x17b5,
  // Variation selectors that are never kept
  0x180b,
  0xfe00,
  0xfe0d,
  // Code points on both sides of the ideographic variation selectors
  0xe00ff,
  0xe01f0,
  // Interlinear annotation anchor
  0xfff9,
];

const REMOVED_CASES: [label: string, char: string][] = REMOVED_CODE_POINTS.map((codePoint) => [
  formatCodePoint(codePoint),
  String.fromCodePoint(codePoint),
]);

const KEPT_CASES: [title: string, name: string][] = [
  ['Persian word with a zero width non-joiner inside', '\u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u0645'],
  ['emoji family joined with zero width joiners', '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'],
  ['emoji with an emoji presentation selector', '\u2764\uFE0F'],
  ['emoji with a text presentation selector', '\u2764\uFE0E'],
  ['joined emoji sequence with a presentation selector inside', '\u2764\uFE0F\u200D\u{1F525}'],
  ['digit keycap sequence', '1\uFE0F\u20E3'],
  ['number sign keycap sequence', '#\uFE0F\u20E3'],
  ['ideograph with an ideographic variation selector', '\u845B\u{E0100}'],
  ['supplementary ideograph with the last ideographic variation selector', '\u{20000}\u{E01EF}'],
  ['regional indicator flag', '\u{1F1E9}\u{1F1EA}'],
  ['name mixing Latin text, an emoji and an ideograph variant', 'Alice \u2764\uFE0F \u845B\u{E0100}'],
];

const CHANGED_CASES: [title: string, name: string, expected: string][] = [
  ['emoji presentation selector after a Latin letter', 'a\uFE0Fb', 'ab'],
  ['text presentation selector after a Latin letter', 'a\uFE0Eb', 'ab'],
  ['ideographic variation selector after a Latin letter', 'a\u{E0100}b', 'ab'],
  ['emoji presentation selector after an ideograph', '\u845B\uFE0F', '\u845B'],
  ['ideographic variation selector after an emoji', '\u2764\u{E0100}', '\u2764'],
  ['second of two presentation selectors', '\u2764\uFE0F\uFE0F', '\u2764\uFE0F'],
  ['second of two ideographic variation selectors', '\u845B\u{E0100}\u{E0101}', '\u845B\u{E0100}'],
  ['variation selector of another kind after an emoji', '\u2764\uFE0D', '\u2764'],
  ['code point before the ideographic selectors after an ideograph', '\u845B\u{E00FF}', '\u845B'],
  ['code point after the ideographic selectors after an ideograph', '\u845B\u{E01F0}', '\u845B'],
  ['presentation selector separated from its emoji by a removed character', '\u2764\u200B\uFE0F', '\u2764'],
  ['presentation selector at the start of a name', '\uFE0FAlice', 'Alice'],
  ['joiners at the edges next to removed characters', '\u200B\u200D Alice \u200C\u061C', 'Alice'],
  ['bidi override hidden inside a name', 'Al\u202Eice\u202C', 'Alice'],
  ['Arabic letter mark between two words', 'Alice\u061C Bob', 'Alice Bob'],
  ['tag characters spelling text inside a name', 'Ali\u{E0062}\u{E006F}\u{E0062}ce', 'Alice'],
  [
    'flag tag sequence loses its tag characters and keeps the base flag',
    '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
    '\u{1F3F4}',
  ],
  ['name made only of removed characters', '\u061C\u200B\u202E\u{E0001}\u3164\u034F\uFE0F\u{E0100}', ''],
];

describe('sanitizeDisplayName format characters', () => {
  it.each(REMOVED_CASES)('removes %s inside a name, at its edges and on its own', (_, char) => {
    expect(sanitizeDisplayName(`Ali${char}ce`)).toBe('Alice');
    expect(sanitizeDisplayName(`${char}Alice${char}`)).toBe('Alice');
    expect(sanitizeDisplayName(`${char}${char}`)).toBe('');
    expect(isValidContactName(char)).toBe(false);
  });

  it.each(KEPT_CASES)('keeps %s', (_, name) => {
    expect(sanitizeDisplayName(name)).toBe(name);
    expect(isValidContactName(name)).toBe(true);
  });

  it.each(CHANGED_CASES)('%s', (_, name, expected) => {
    expect(sanitizeDisplayName(name)).toBe(expected);
    expect(isValidContactName(name)).toBe(expected.length > 0);
  });

  it('gives the same result for names that differ only in removed characters', () => {
    const plain = sanitizeDisplayName('Alice');

    expect(sanitizeDisplayName('Al\u061Cice')).toBe(plain);
    expect(sanitizeDisplayName('Alice\u{E0041}')).toBe(plain);
    expect(sanitizeDisplayName('\u2067Alice\u2069')).toBe(plain);
  });

  it('returns the same string when applied twice', () => {
    const names = [
      ...REMOVED_CASES.flatMap(([, char]) => [`Ali${char}ce`, `${char}Alice${char}`, `${char}${char}`]),
      ...KEPT_CASES.map(([, name]) => name),
      ...CHANGED_CASES.map(([, name]) => name),
    ];

    for (const name of names) {
      const sanitized = sanitizeDisplayName(name);

      expect(sanitizeDisplayName(sanitized)).toBe(sanitized);
    }
  });
});

describe('sanitizeDisplayName over every Unicode code point', () => {
  // The sweep takes under a second on an idle machine; the margin keeps the
  // hook from timing out on a runner that is busy with other jobs.
  const SWEEP_TIMEOUT = 60_000;
  const LAST_CODE_POINT = 0x10ffff;
  const FIRST_SURROGATE = 0xd800;
  const LAST_SURROGATE = 0xdfff;
  const FIRST_IDEOGRAPHIC_SELECTOR = 0xe0100;
  const LAST_IDEOGRAPHIC_SELECTOR = 0xe01ef;
  const JOINERS = ['\u200C', '\u200D'];
  const PRESENTATION_SELECTORS = ['\uFE0E', '\uFE0F'];
  const IDEOGRAPHIC_SELECTORS = [FIRST_IDEOGRAPHIC_SELECTOR, LAST_IDEOGRAPHIC_SELECTOR].map((c) =>
    String.fromCodePoint(c),
  );
  const EMOJI_BASE = '\u2764';
  const IDEOGRAPH_BASE = '\u845B';

  const LINE_BREAKING = /^[\p{Cc}\p{Zl}\p{Zp}]$/u;
  const REMOVABLE = /^[\p{Cf}\p{Default_Ignorable_Code_Point}]$/u;
  const RESIDUE = /(?![\u200C\u200D])[\p{Cf}\p{Default_Ignorable_Code_Point}\p{Cc}\p{Zl}\p{Zp}]/u;
  const EMOJI = /^\p{Emoji}$/u;
  const UNIFIED_IDEOGRAPH = /^\p{Unified_Ideograph}$/u;
  const SELECTOR_BASE = /^[\p{Emoji}\p{Unified_Ideograph}]$/u;

  // Failures are collected as code point labels and asserted once per rule: an
  // `expect` per code point would take minutes.
  let sweptCount = 0;
  const residue: string[] = [];
  const unexpected: string[] = [];
  const unstable: string[] = [];
  const droppedSelectors: string[] = [];
  const keptAfterBase: string[] = [];

  beforeAll(() => {
    for (let codePoint = 0; codePoint <= LAST_CODE_POINT; codePoint++) {
      // A lone surrogate is not a character
      if (codePoint >= FIRST_SURROGATE && codePoint <= LAST_SURROGATE) continue;

      const char = String.fromCodePoint(codePoint);
      const name = `a${char}b`;
      const sanitized = sanitizeDisplayName(name);
      sweptCount++;

      if (RESIDUE.test(sanitized)) residue.push(formatCodePoint(codePoint));

      if (sanitized !== name) {
        const isRemovable = REMOVABLE.test(char) && !JOINERS.includes(char);

        let expected = name.normalize('NFC');
        if (LINE_BREAKING.test(char)) expected = 'a b';
        else if (isRemovable) expected = 'ab';

        if (sanitized !== expected) unexpected.push(formatCodePoint(codePoint));
        if (sanitizeDisplayName(sanitized) !== sanitized) unstable.push(formatCodePoint(codePoint));

        if (isRemovable) {
          // After an emoji or an ideograph the character goes as well, unless
          // it is the selector that belongs to that base.
          const isIdeographicSelector =
            codePoint >= FIRST_IDEOGRAPHIC_SELECTOR && codePoint <= LAST_IDEOGRAPHIC_SELECTOR;
          const afterEmoji = PRESENTATION_SELECTORS.includes(char) ? `${EMOJI_BASE}${char}b` : `${EMOJI_BASE}b`;
          const afterIdeograph = isIdeographicSelector ? `${IDEOGRAPH_BASE}${char}b` : `${IDEOGRAPH_BASE}b`;

          if (
            sanitizeDisplayName(`${EMOJI_BASE}${char}b`) !== afterEmoji ||
            sanitizeDisplayName(`${IDEOGRAPH_BASE}${char}b`) !== afterIdeograph
          ) {
            keptAfterBase.push(formatCodePoint(codePoint));
          }
        }
      }

      if (SELECTOR_BASE.test(char)) {
        const selectors = [
          ...(EMOJI.test(char) ? PRESENTATION_SELECTORS : []),
          ...(UNIFIED_IDEOGRAPH.test(char) ? IDEOGRAPHIC_SELECTORS : []),
        ];
        const isSelectorDropped = selectors.some((selector) => {
          const sequence = `a${char}${selector}b`;

          return sanitizeDisplayName(sequence) !== sequence;
        });
        if (isSelectorDropped) droppedSelectors.push(formatCodePoint(codePoint));
      }
    }
  }, SWEEP_TIMEOUT);

  it('covers every code point except surrogates', () => {
    expect(sweptCount).toBe(LAST_CODE_POINT + 1 - (LAST_SURROGATE - FIRST_SURROGATE + 1));
  });

  it('leaves no format, default-ignorable, control or separator code point other than the joiners', () => {
    expect(residue).toEqual([]);
  });

  it('changes a name only by removing a format character, replacing a line-breaking one or normalizing to NFC', () => {
    expect(unexpected).toEqual([]);
  });

  it('returns the same string when applied twice', () => {
    expect(unstable).toEqual([]);
  });

  it('keeps a presentation selector after every emoji and an ideographic selector after every unified ideograph', () => {
    expect(droppedSelectors).toEqual([]);
  });

  it('removes every format character after an emoji or an ideograph except the selector of that base', () => {
    expect(keptAfterBase).toEqual([]);
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
