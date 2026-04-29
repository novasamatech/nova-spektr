import { type ApiPromise } from '@polkadot/api';

import { type Asset, type OrmlExtras, type StatemineExtras, AssetType, StakingType } from '@/shared/core/types/asset';
import { assert } from '@/shared/lib/utils';

export const getNativeAsset = (assets: Asset[]): Asset => {
  const nativeAsset = assets.find((asset) => asset.type === AssetType.NATIVE);
  if (!nativeAsset) {
    // some networks use orml assets as native (cringe)
    const firstAsset = assets.at(0);
    assert(firstAsset, 'Native asset is not found');
    return firstAsset;
  }

  return nativeAsset;
};

export const getNativeAssetId = (assets: Asset[]): string => {
  return getNativeAsset(assets).assetId.toString();
};

/**
 * Get ID of the asset by type
 *
 * @param asset Network asset
 *
 * @returns {String}
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
 *
 * @param assets Network assets
 * @param id Identifier to be searched
 *
 * @returns {Asset | undefined}
 */
export const getAssetById = (id: string, assets?: Asset[]): Asset | undefined => {
  if (!assets || assets.length === 0) return undefined;

  return assets.find((asset) => getAssetId(asset) === id);
};

/**
 * Get asset by type extras
 */
export const getAssetByTypeExtras = (api: ApiPromise, assets: Asset[], assetId: string): Asset | null => {
  return (
    assets.find((asset) => {
      if (!asset.typeExtras) return;

      if ('assetId' in asset.typeExtras) {
        return asset.typeExtras.assetId === assetId;
      }

      try {
        const id = api.createType(asset.typeExtras.currencyIdType, asset.typeExtras.currencyIdScale).toJSON();
        const currencyId = api.createType(asset.typeExtras.currencyIdType, assetId).toJSON();

        return id === currencyId;
      } catch {
        return false;
      }
    }) ?? null
  );
};

/**
 * Get Relaychain asset
 *
 * @param assets Network assets
 *
 * @returns {Asset | undefined}
 */
export const getRelaychainAsset = (assets: Asset[] = []): Asset | undefined => {
  if (assets.length === 0) return undefined;

  return assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);
};
