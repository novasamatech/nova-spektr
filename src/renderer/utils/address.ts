import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { Asset, AssetType, OrmlExtras, StatemineExtras } from '@renderer/domain/asset';
import { HexString, PublicKey } from '@renderer/domain/shared-kernel';
import { PUBLIC_KEY_LENGTH, SS58_DEFAULT_PREFIX } from './constants';

export const formatAddress = (address = '', prefix = SS58_DEFAULT_PREFIX): string => {
  if (!address) return '';

  return encodeAddress(decodeAddress(address), prefix) || address;
};

/**
 * Get public key of the address
 * @param address account's address
 * @return {string | undefined}
 */
export const toPublicKey = (address: string): PublicKey | undefined => {
  if (!address) return undefined;

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
export const pasteAddressHandler = (handler: (value: string) => void) => async () => {
  try {
    const text = await navigator.clipboard.readText();
    handler(text.trim());
  } catch (error) {
    console.warn(error);
  }
};

/**
 * Get asset id based on it's type
 * @param asset the asset to get id from
 */
export const getAssetId = (asset: Asset): string => {
  if (asset.type === AssetType.STATEMINE) {
    return (asset.typeExtras as StatemineExtras).assetId;
  }

  if (asset.type === AssetType.ORML) {
    return (asset.typeExtras as OrmlExtras).currencyIdScale;
  }

  return asset.assetId.toString() as HexString;
};

export const validateAddress = (address: string): boolean => Boolean(toPublicKey(address));
