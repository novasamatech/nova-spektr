import { type Asset, AssetType, type OrmlExtras, StakingType, type StatemineExtras } from '@shared/core/types/asset';

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
export const getAssetById = (id: string, assets?: Asset[]): Asset | undefined => {
  if (!assets || assets.length === 0) return undefined;

  return assets.find((asset) => getAssetId(asset) === id) || assets[0];
};

/**
 * Get Relaychain asset
 * @param assets network assets
 * @return {Asset | undefined}
 */
export const getRelaychainAsset = (assets: Asset[] = []): Asset | undefined => {
  if (assets.length === 0) return undefined;

  return assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);
};
