import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { PublicKey, AccountID } from '@renderer/domain/shared-kernel';
import { PUBLIC_KEY_LENGTH, SS58_DEFAULT_PREFIX } from './constants';

export const formatAddress = (address?: AccountID | PublicKey, prefix = SS58_DEFAULT_PREFIX): string => {
  if (!address) return '';

  return encodeAddress(decodeAddress(address), prefix) || address;
};

/**
 * Get public key of the address
 * @param address account's address
 * @return {String | undefined}
 */
export const toPublicKey = (address?: string): PublicKey | undefined => {
  if (!address) return;

  try {
    return u8aToHex(decodeAddress(address));
  } catch (e) {
    return undefined;
  }
};

export const isCorrectPublicKey = (publicKey: PublicKey): boolean => {
  if (!publicKey) return false;

  const publicKeyTrimmed = publicKey.replace(/^0x/, '');

  return publicKeyTrimmed.length === PUBLIC_KEY_LENGTH && /^[0-9a-fA-F]+$/.test(publicKeyTrimmed);
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

export const validateAddress = (address: string): boolean => {
  return Boolean(toPublicKey(address));
};
