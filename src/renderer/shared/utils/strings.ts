import { Identity } from '@renderer/domain/identity';

/**
 * Validate WebSocket address
 * @param address address to validate
 * @return {Boolean}
 */
export const validateWsAddress = (address: string): boolean => {
  return /^ws(s)?:\/\/.+(\.[a-z]{2,}|:\d{4,5})(\/[a-z\d_-]+)*\W{0}\/?/i.test(address);
};

/**
 * Validate Parity Signer QR format
 * @param value qr code to validate
 * @return {Boolean}
 */
export const validateSignerFormat = (value: string): boolean => {
  return /^substrate:[a-zA-Z0-9]+:0x[a-zA-Z0-9]+$/.test(value);
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

export const includes = (value?: string, searchString?: string): boolean => {
  if (!value) return false;

  return value.toLowerCase().includes((searchString || '').toLowerCase());
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
