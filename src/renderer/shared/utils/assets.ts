import { Asset, AssetType, OrmlExtras, StatemineExtras } from '@renderer/domain/asset';

export const getAssetId = (asset: Asset): string => {
  if (asset.type === AssetType.STATEMINE) {
    return (asset.typeExtras as StatemineExtras).assetId;
  }

  if (asset.type === AssetType.ORML) {
    return (asset.typeExtras as OrmlExtras).currencyIdScale;
  }

  return asset.assetId.toString();
};

export const getAssetById = (assets: Asset[], id?: string): Asset | undefined =>
  assets.find((a) => getAssetId(a) === id) || assets[0];
