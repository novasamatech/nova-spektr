import { hexToU8a, isHex, isU8a, u8aToHex, u8aToU8a } from '@polkadot/util';
import { base58Decode, checkAddressChecksum, decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { type AccountId, type Address, type Chain } from '@/shared/core';

import { isEvmChain } from './chains';
import {
  ADDRESS_ALLOWED_ENCODED_LENGTHS,
  ETHEREUM_PUBLIC_KEY_LENGTH_BYTES,
  PUBLIC_KEY_LENGTH,
  PUBLIC_KEY_LENGTH_BYTES,
  SS58_DEFAULT_PREFIX,
} from './constants';
import { truncate } from './strings';

/**
 * Format address or accountId with prefix and chunk size Example: chunk = 6,
 * would produce address like 1ChFWe...X7iTVZ
 *
 * @param value Account address or accountId
 * @param params Chunk and prefix (default is 42)
 *
 * @returns {String}
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
 *
 * @param address Value to make short
 * @param chunk How many letters should be visible from start/end
 *
 * @returns {String}
 */
export const toShortAddress = (address: Address, chunk = 6): string => {
  return address.length < 13 ? address : truncate(address, chunk, chunk);
};

/**
 * Try to get account id of the address
 *
 * @param address Account's address
 *
 * @returns {String}
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
 *
 * @param accountId Public key to check
 *
 * @returns {Boolean}
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
  } catch {
    return false;
  }
};

/**
 * Check is account's address valid
 *
 * @param address Account's address
 * @param chain Chain to operate
 *
 * @returns {Boolean}
 */
export const validateAddress = (address: Address | AccountId, chain?: Chain): boolean => {
  // TODO: Only to support previous version. Make `chain` mandatory after refactoring all places of use
  if (!chain) {
    return validateEvmAddress(address) || validateSubstrateAddress(address);
  }

  return isEvmChain(chain) ? validateEvmAddress(address) : validateSubstrateAddress(address);
};

const validateSubstrateAddress = (address: Address | AccountId): boolean => {
  if (isU8a(address) || isHex(address)) {
    return u8aToU8a(address).length === PUBLIC_KEY_LENGTH_BYTES;
  }

  try {
    const decoded = base58Decode(address);
    if (!ADDRESS_ALLOWED_ENCODED_LENGTHS.includes(decoded.length)) return false;

    const [isValid, endPos, ss58Length] = checkAddressChecksum(decoded);

    return isValid && Boolean(decoded.slice(ss58Length, endPos));
  } catch {
    return false;
  }
};

const validateEvmAddress = (address: Address | AccountId): boolean => {
  if (!isU8a(address) && !isHex(address)) return false;

  return u8aToU8a(address).length === ETHEREUM_PUBLIC_KEY_LENGTH_BYTES;
};
