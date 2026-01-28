import { hexToU8a, isHex, isU8a, u8aToHex, u8aToU8a } from '@polkadot/util';
import { base58Decode, checkAddressChecksum, decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { type Address, type Chain, type HexString, ChainOptions } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import {
  ADDRESS_ALLOWED_ENCODED_LENGTHS,
  ETHEREUM_PUBLIC_KEY_LENGTH_BYTES,
  PUBLIC_KEY_LENGTH,
  PUBLIC_KEY_LENGTH_BYTES,
  SS58_DEFAULT_PREFIX,
} from './constants';
import { truncate } from './strings';

/**
 * Format address or accountId with prefix. Use it only for ui purposes.
 *
 * @param value Account address or accountId
 * @param params Chunk and prefix (default is 42)
 *
 * @returns {String}
 */
export const toAddress = (value: string, params?: { prefix?: number }): Address => {
  const prefixValue = params?.prefix ?? SS58_DEFAULT_PREFIX;

  let address = '';
  try {
    address = encodeAddress(value, prefixValue);
  } catch {
    address = value;
  }

  return address as Address;
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
export const toShortAddress = (address: string, chunk = 6): string => {
  return address.length < 13 ? address : truncate(address, chunk, chunk);
};

/**
 * Try to get account id of the address
 *
 * @param address Account's address
 *
 * @returns {String}
 */
export const toAccountId = (value: string): AccountId => {
  try {
    return u8aToHex(decodeAddress(value)) as AccountId;
  } catch {
    // TODO WTF
    return '0x00' as AccountId;
  }
};

/**
 * Check is public key correct
 *
 * @param accountId Public key to check
 *
 * @returns {Boolean}
 */
export const isCorrectAccountId = (accountId?: HexString): boolean => {
  if (!accountId) return false;

  const trimmedValue = accountId.replace(/^0x/, '');

  return trimmedValue.length === PUBLIC_KEY_LENGTH && /^[0-9a-fA-F]+$/.test(trimmedValue);
};

export const isSubstrateAccountId = (accountId?: string): boolean => {
  if (!accountId) return false;

  try {
    return hexToU8a(accountId).length === 32;
  } catch {
    return false;
  }
};

export const isEthereumAccountId = (accountId?: string): boolean => {
  if (!accountId) return false;

  try {
    return hexToU8a(accountId).length === 20;
  } catch {
    return false;
  }
};

/**
 * Check whether chain is evm or not
 *
 * @param chain Value to check
 *
 * @returns {Boolean}
 */
export function isEvmChain(chain: Chain): boolean {
  return chain.options?.includes(ChainOptions.ETHEREUM_BASED) ?? false;
}

/**
 * Check is account's address valid
 *
 * @param address Account's address
 * @param chain Chain to operate
 *
 * @returns {Boolean}
 */
export const validateAddress = (address: string, chain?: Chain): address is Address => {
  // TODO: Only to support previous version. Make `chain` mandatory after refactoring all places of use
  if (!chain) {
    return validateEvmAddress(address) || validateSubstrateAddress(address);
  }

  return isEvmChain(chain) ? validateEvmAddress(address) : validateSubstrateAddress(address);
};

const validateSubstrateAddress = (address: string): boolean => {
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

const validateEvmAddress = (address: string): boolean => {
  if (!isU8a(address) && !isHex(address)) return false;

  return u8aToU8a(address).length === ETHEREUM_PUBLIC_KEY_LENGTH_BYTES;
};
