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

export const validateSubstrateAddress = (address: string): boolean => {
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

// Every place the app names an account on the user's behalf shortens the
// account's own address with `toShortAddress` and one of these chunk sizes:
// 5 (multisig creation, account sync, name resolution) or 6 (proxy discovery).
const GENERATED_NAME_CHUNKS = [5, 6];

// Prefixes a stored auto-name may have been built with: the chain's own, the
// app default and the generic substrate one. Callers without chain data still
// get the last two.
const GENERATED_NAME_FALLBACK_PREFIXES = [SS58_DEFAULT_PREFIX, 42];

/**
 * Every string the app could have stored as this account's auto-generated name:
 * its address shortened with each historical chunk size and prefix, plus the
 * raw hex account id shortened the same way (the flexible multisig flow named
 * its pure proxy from the hex id).
 */
const getGeneratedAccountNames = (accountId: AccountId, addressPrefix: number | undefined): string[] => {
  const prefixes = new Set([
    ...(addressPrefix === undefined ? [] : [addressPrefix]),
    ...GENERATED_NAME_FALLBACK_PREFIXES,
  ]);
  const sources = [accountId, ...Array.from(prefixes, (prefix) => toAddress(accountId, { prefix }))];

  return sources.flatMap((source) => GENERATED_NAME_CHUNKS.map((chunk) => toShortAddress(source, chunk)));
};

/**
 * Whether `name` is one the app generated for this account rather than one the
 * user typed.
 *
 * `nameType` is the real answer to that question, but it cannot be trusted on
 * older profiles: storage migration 14 stamped `CUSTOM` onto every account that
 * predated the flag — including multisigs and proxied wallets, whose names have
 * always been derived from their address. Migration 21 repaired Polkadot Vault
 * keys and migration 22 the accounts whose name regenerates without chain data;
 * a proxied account named with a chain-specific prefix is only caught at
 * runtime, when the caller passes that prefix.
 *
 * A generated name is always a shortening of the account's _own_ address (on
 * its own, or as the tail of a proxy's "<ProxyType> for [pure] <address>"), so
 * the check regenerates those candidates and compares exactly. Matching a loose
 * "xxxx...xxxx" shape instead would swallow user names like `Team...Fund` or
 * `Main...Vault`.
 */
export const isGeneratedAccountName = (
  name: string,
  accountId: AccountId,
  addressPrefix: number | undefined,
): boolean => {
  return getGeneratedAccountNames(accountId, addressPrefix).some(
    (shortened) => name === shortened || name.endsWith(` for ${shortened}`) || name.endsWith(` for pure ${shortened}`),
  );
};
