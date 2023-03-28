import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { Asset, AssetType, OrmlExtras, StatemineExtras, StakingType } from '@renderer/domain/asset';
import { PublicKey, AccountID } from '@renderer/domain/shared-kernel';
import { PUBLIC_KEY_LENGTH, SS58_DEFAULT_PREFIX } from './constants';

/**
 * Format address based on prefix
 * @param address account's address
 * @param prefix ss58 prefix
 * @return {String}
 */
export const formatAddress = (address?: AccountID | PublicKey, prefix = SS58_DEFAULT_PREFIX): string => {
  if (!address) return '';

  return encodeAddress(decodeAddress(address), prefix) || address;
};

/**
 * Try to get public key of the address
 * @param address account's address
 * @return {PublicKey | undefined}
 */
export const toPublicKey = (address?: string): PublicKey | undefined => {
  if (!address) return;

  try {
    return u8aToHex(decodeAddress(address));
  } catch {
    return undefined;
  }
};

/**
 * Check is public key correct
 * @param publicKey public key to check
 * @return {Boolean}
 */
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

/**
 * Check is account's address valid
 * @param address account's address
 * @return {Boolean}
 */
export const isAddressValid = (address?: string): boolean => {
  return Boolean(toPublicKey(address));
};

/**
 * Get ID of the asset by type
 * @param asset network asset
 * @return {String}
 */
export const getAssetId = (asset: Asset): string => {
  if (asset.type === AssetType.STATEMINE) {
    return (asset.typeExtras as StatemineExtras).assetId;
  }
  if (asset.type === AssetType.ORML) {
    return (asset.typeExtras as OrmlExtras).currencyIdScale;
  }

  return asset.assetId.toString();
};

/**
 * Get asset by ID
 * @param assets network assets
 * @param id identifier to be searched
 * @return {Asset | undefined}
 */
export const getAssetById = (assets: Asset[], id: string): Asset | undefined => {
  return assets.find((asset) => asset.assetId.toString() === id);
};

/**
 * Get Relaychain asset
 * @param assets network assets
 * @return {Asset | undefined}
 */
export const getRelaychainAsset = (assets: Asset[]): Asset | undefined => {
  return assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);
};
