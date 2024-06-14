import { Identity } from '@shared/core/types/identity';

/**
 * Validate Polkadot Vault QR format
 * @param value qr code to validate
 * @return {Boolean}
 */
export const validateSignerFormat = (value: string): boolean => {
  return validateSubstrateSignerFormat(value) || validateEthereumSignerFormat(value);
};

/**
 * Validate Substrate QR format
 * @param value qr code to validate
 * @return {Boolean}
 */
export const validateSubstrateSignerFormat = (value: string): boolean => {
  return /^substrate:[a-zA-Z0-9]+:0x[a-zA-Z0-9]+$/.test(value);
};

/**
 * Validate Ethereum QR format
 * @param value qr code to validate
 * @return {Boolean}
 */
export const validateEthereumSignerFormat = (value: string): boolean => {
  return /^ethereum:0x[a-zA-Z0-9]+:0x[a-zA-Z0-9]+$/.test(value);
};

/**
 * Copies string value to clipboard
 * @param text value to copy
 * @return {Promise}
 */
export const copyToClipboard = async (text = ''): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.warn('Clipboard is not supported');
  }
};

/**
 * Check does arguments contain query string
 * @param query string value
 * @param args values to be checked
 * @return {Boolean}
 */
export const isStringsMatchQuery = (query: string, args: string[]): boolean => {
  return args.reduce((acc, word) => acc.concat(word.toLowerCase()), '').includes(query.toLowerCase());
};

/**
 * Get full identity or just part of it
 * @param identity validator's identity
 * @return {String}
 */
export const getComposedIdentity = (identity?: Identity): string => {
  if (!identity) return '';

  return identity.subName ? `${identity.parent.name}/${identity.subName}` : identity.parent.name;
};

export const includes = (value?: string, searchString = ''): boolean => {
  if (!value) return false;

  return value.toLowerCase().includes(searchString.toLowerCase());
};

/**
 * Truncate text leaving fixed number of characters
 * @param text text to truncate
 * @param start number of leading symbols
 * @param end number of ending symbols
 * @return {String}
 */
export const truncate = (text: string, start = 5, end = 5): string => {
  if (text.length <= start + end) return text;

  return `${text.slice(0, start)}...${text.slice(-1 * end)}`;
};

/**
 * Formats the section and method of transaction to the format:
 * Section split camel case to separate words, 1st capital: Method split camel case to separate words - 1st capital
 * @param section extrinsic call section
 * @param method extrinsic call method
 * @return {String}
 */
export const formatSectionAndMethod = (section: string, method: string): string => {
  const splitFn = (value: string) => `${value[0].toUpperCase()}${value.slice(1)}`;

  const sectionSplit = section.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  const methodSplit = method.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

  return `${splitFn(sectionSplit)}: ${splitFn(methodSplit)}`;
};

/**
 * Formats number without exponential notation and removes trailing zeros
 * @param value number to format
 * @param maxPrecision Maximum number of characters in decimal part
 * @return {String}
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
 * @param value string in camel case
 * @return {String}
 */
export const splitCamelCaseString = (value: string): string => {
  return value.replace(/([a-zA-Z])(?=[A-Z])/g, '$1 ');
};

/**
 * Add leading zero to the number below 10
 * @param value number to edit
 * @return {String}
 */
export const addLeadingZero = (value: number): string => {
  return value < 10 ? `0${value}` : `${value}`;
};
