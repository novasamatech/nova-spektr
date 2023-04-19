import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress, isAddress } from '@polkadot/util-crypto';

import { AccountID, Address } from '@renderer/domain/shared-kernel';
import { PUBLIC_KEY_LENGTH, SS58_DEFAULT_PREFIX } from './constants';

/**
 * Format address or accountId to size and prefix
 * @param value account address or accountId
 * @param params size and prefix (default is 42)
 * @return {String}
 */
export const toAddress = (value: Address | AccountID, params?: { size?: number; prefix?: number }): string => {
  const sizeValue = params?.size;
  const prefixValue = params?.prefix ?? SS58_DEFAULT_PREFIX;

  const address = encodeAddress(decodeAddress(value), prefixValue);

  if (sizeValue) {
    return address.length < 13 ? address : `${address.slice(0, sizeValue)}...${address.slice(-1 * sizeValue)}`;
  }

  return address;
};

/**
 * Check is account's address valid
 * @param address account's address
 * @return {Boolean}
 */
export const validateAddress = (address?: Address | AccountID): boolean => {
  return isAddress(address);
};

/**
 * Try to get account id of the address
 * @param address account's address
 * @return {String}
 */
export const toAccountId = (address: Address): AccountID => {
  try {
    return u8aToHex(decodeAddress(address));
  } catch {
    return '0x0';
  }
};

/**
 * Check is public key correct
 * @param accountId public key to check
 * @return {Boolean}
 */
export const isCorrectAccountId = (accountId?: AccountID): boolean => {
  if (!accountId) return false;

  const trimmedValue = accountId.replace(/^0x/, '');

  return trimmedValue.length === PUBLIC_KEY_LENGTH && /^[0-9a-fA-F]+$/.test(trimmedValue);
};

/**
 * Paste address input handler
 * @param handler input's onChange function
 * @return {Function}
 */
export const pasteAddressHandler = (handler: (value: string) => void) => {
  return async () => {
    try {
      const text = await navigator.clipboard.readText();
      handler(text.trim());
    } catch (error) {
      console.warn(error);
    }
  };
};
