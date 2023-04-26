import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress, isAddress } from '@polkadot/util-crypto';

import { AccountId, Address } from '@renderer/domain/shared-kernel';
import { PUBLIC_KEY_LENGTH, SS58_DEFAULT_PREFIX } from './constants';

/**
 * Format address or accountId with prefix and chunk size
 * Example: chunk = 6, would produce address like  1ChFWe...X7iTVZ
 * @param value account address or accountId
 * @param params chunk and prefix (default is 42)
 * @return {String}
 */
export const toAddress = (value: Address | AccountId, params?: { chunk?: number; prefix?: number }): Address => {
  const chunkValue = params?.chunk;
  const prefixValue = params?.prefix ?? SS58_DEFAULT_PREFIX;

  let address = '';
  try {
    address = encodeAddress(decodeAddress(value), prefixValue);
  } catch {
    return address;
  }

  return chunkValue ? toShortAddress(address, chunkValue) : address;
};

/**
 * Get short address representation
 * `5DXYNRXmNmFLFxxUjMXSzKh3vqHRDfDGGbY3BnSdQcta1SkX --> 5DXYNR...ta1SkX`
 * @param address value to make short
 * @param chunk how many letters should be visible from start/end
 * @return {String}
 */
export const toShortAddress = (address: Address, chunk = 6): string => {
  return address.length < 13 ? address : `${address.slice(0, chunk)}...${address.slice(-1 * chunk)}`;
};

/**
 * Check is account's address valid
 * @param address account's address
 * @return {Boolean}
 */
export const validateAddress = (address?: Address | AccountId): boolean => {
  return isAddress(address);
};

/**
 * Try to get account id of the address
 * @param address account's address
 * @return {String}
 */
export const toAccountId = (address: Address): AccountId => {
  try {
    return u8aToHex(decodeAddress(address));
  } catch {
    return '0x00';
  }
};

/**
 * Check is public key correct
 * @param accountId public key to check
 * @return {Boolean}
 */
export const isCorrectAccountId = (accountId?: AccountId): boolean => {
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
