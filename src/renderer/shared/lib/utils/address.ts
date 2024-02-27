import { hexToU8a, isHex, isU8a, u8aToHex, u8aToU8a } from '@polkadot/util';
import { base58Decode, checkAddressChecksum, decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import type { AccountId, Address } from '@shared/core';
import { truncate } from './strings';
import {
  ADDRESS_ALLOWED_ENCODED_LENGTHS,
  ETHEREUM_PUBLIC_KEY_LENGTH_BYTES,
  PUBLIC_KEY_LENGTH,
  PUBLIC_KEY_LENGTH_BYTES,
  SS58_DEFAULT_PREFIX,
} from './constants';

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
    address = value;
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
  return address.length < 13 ? address : truncate(address, chunk, chunk);
};

/**
 * Check is account's address valid
 * @param address account's address
 * @return {Boolean}
 */
export const validateAddress = (address?: Address | AccountId): boolean => {
  if (!address) return false;

  if (isU8a(address) || isHex(address)) {
    return [ETHEREUM_PUBLIC_KEY_LENGTH_BYTES, PUBLIC_KEY_LENGTH_BYTES].includes(u8aToU8a(address).length);
  }

  try {
    const decoded = base58Decode(address);
    if (!ADDRESS_ALLOWED_ENCODED_LENGTHS.includes(decoded.length)) return false;

    const [isValid, endPos, ss58Length] = checkAddressChecksum(decoded);

    return isValid && Boolean(decoded.slice(ss58Length, endPos));
  } catch (error) {
    return false;
  }
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

export const isEthereumAccountId = (accountId?: AccountId): boolean => {
  if (!accountId) return false;

  try {
    return hexToU8a(accountId).length === 20;
  } catch (e) {
    return false;
  }
};
