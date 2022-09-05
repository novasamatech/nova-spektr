import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { PublicKey } from '@renderer/domain/shared-kernel';
import { PUBLIC_KEY_LENGTH, SS58_DEFAULT_PREFIX } from './constants';

export const formatAddress = (address: string, prefix = SS58_DEFAULT_PREFIX): string => {
  if (!address) return '';

  return encodeAddress(decodeAddress(address), prefix) || address;
};

export const toPublicKey = (address: string): PublicKey | undefined => {
  if (!address) return;

  try {
    return u8aToHex(decodeAddress(address));
  } catch (e) {
    return;
  }
};

export const isCorrectPublicKey = (publicKey: PublicKey): boolean => {
  if (!publicKey) return false;

  const publicKeyTrimmed = publicKey.replace(/^0x/, '');

  return publicKeyTrimmed.length === PUBLIC_KEY_LENGTH && /^[0-9a-fA-F]+$/.test(publicKeyTrimmed);
};
