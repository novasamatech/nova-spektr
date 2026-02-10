import { type HexString } from '@/shared/core';

/**
 * Validate Polkadot Vault QR format
 *
 * @param value Qr code to validate
 *
 * @returns {Boolean}
 */
export const validateSignerFormat = (value: string): boolean => {
  return validateSubstrateSignerFormat(value) || validateEthereumSignerFormat(value);
};

/**
 * Validate Substrate QR format
 *
 * @param value Qr code to validate
 *
 * @returns {Boolean}
 */
export const validateSubstrateSignerFormat = (value: string): boolean => {
  return /^substrate:[a-zA-Z0-9]+:0x[a-zA-Z0-9]+$/.test(value);
};

/**
 * Validate Ethereum QR format
 *
 * @param value Qr code to validate
 *
 * @returns {Boolean}
 */
export const validateEthereumSignerFormat = (value: string): boolean => {
  return /^ethereum:0x[a-zA-Z0-9]+:0x[a-zA-Z0-9]+$/.test(value);
};

/**
 * Copies string value to clipboard
 *
 * @param text Value to copy
 *
 * @returns {Promise}
 */
export const copyToClipboard = async (text = ''): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    console.warn('Clipboard is not supported');
  }
};

/**
 * Check does arguments contain query string
 *
 * @param query String value
 * @param args Values to be checked
 *
 * @returns {Boolean}
 */
export const isStringsMatchQuery = (query: string, args: string[]): boolean => {
  return args.reduce((acc, word) => acc.concat(word.toLowerCase()), '').includes(query.toLowerCase());
};

export const includes = (value?: string, searchString = ''): boolean => {
  if (!value) return false;

  return value.toLowerCase().includes(searchString.toLowerCase());
};

export const includesMultiple = (values: (string | undefined)[], searchString = ''): boolean => {
  return values.some((value) => includes(value, searchString));
};

/**
 * Truncate text leaving fixed number of characters
 *
 * @param text Text to truncate
 * @param start Number of leading symbols
 * @param end Number of ending symbols
 *
 * @returns {String}
 */
export const truncate = (text: string, start = 5, end = start): string => {
  if (text.length <= start + end) return text;

  return `${text.slice(0, start)}...${text.slice(-1 * end)}`;
};

/**
 * Formats the section and method of transaction to the format: Section split
 * camel case to separate words, 1st capital: Method split camel case to
 * separate words - 1st capital
 *
 * @param section Extrinsic call section
 * @param method Extrinsic call method
 *
 * @returns {String}
 */
export const formatSectionAndMethod = (section: string, method: string): string => {
  const splitFn = (value: string) => `${value[0]?.toUpperCase()}${value.slice(1)}`;

  const sectionSplit = section.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  const methodSplit = method.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

  return `${splitFn(sectionSplit)}: ${splitFn(methodSplit)}`;
};

/**
 * Formats number without exponential notation and removes trailing zeros
 *
 * @param value Number to format
 * @param maxPrecision Maximum number of characters in decimal part
 *
 * @returns {String}
 */
export const toFixedNotation = (value: number, maxPrecision = 20): string => {
  const fixedValue = value.toFixed(maxPrecision);
  const decimalPart = fixedValue.split('.')[1];
  if (!decimalPart) return value.toString();

  const trailingZeros = decimalPart.search(/0+(?![1-9])+$/g);
  if (trailingZeros === -1) {
    return fixedValue;
  }

  return value.toFixed(trailingZeros);
};

/**
 * Splits string in camelCase by capital letters and adds spaces
 *
 * @param value String in camel case
 *
 * @returns {String}
 */
export const splitCamelCaseString = (value: string): string => {
  return value.replace(/([a-zA-Z])(?=[A-Z])/g, '$1 ');
};

/**
 * Add leading zero to the number below 10
 *
 * @param value Number to edit
 *
 * @returns {String}
 */
export const addLeadingZero = (value: number): string => {
  return value < 10 ? `0${value}` : `${value}`;
};

export const isHex = (v: string): v is HexString => {
  return v.startsWith('0x');
};

const romanNumbersLookup = [
  ['M', 1000],
  ['CM', 900],
  ['D', 500],
  ['CD', 400],
  ['C', 100],
  ['XC', 90],
  ['L', 50],
  ['XL', 40],
  ['X', 10],
  ['IX', 9],
  ['V', 5],
  ['IV', 4],
  ['I', 1],
] as const;

export const toRomanNumeral = (num: number) => {
  if (num === 0) {
    return '0';
  }

  return romanNumbersLookup.reduce((acc, [k, v]) => {
    acc += k.repeat(Math.floor(num / v));
    num = num % v;

    return acc;
  }, '');
};

export const fromRomanNumeral = (roman: string): number => {
  let accumulator = 0;
  for (let i = 0; i < roman.length; i++) {
    if (roman[i] === 'I' && roman[i + 1] === 'V') {
      accumulator += 4;
      i++;
    } else if (roman[i] === 'I' && roman[i + 1] === 'X') {
      accumulator += 9;
      i++;
    } else if (roman[i] === 'X' && roman[i + 1] === 'L') {
      accumulator += 40;
      i++;
    } else if (roman[i] === 'X' && roman[i + 1] === 'C') {
      accumulator += 90;
      i++;
    } else if (roman[i] === 'C' && roman[i + 1] === 'D') {
      accumulator += 400;
      i++;
    } else if (roman[i] === 'C' && roman[i + 1] === 'M') {
      accumulator += 900;
      i++;
    } else {
      const lookup = romanNumbersLookup.find((x) => x[0] === roman[i]);
      if (lookup) {
        accumulator += lookup[1];
      }
    }
  }
  return accumulator;
};
