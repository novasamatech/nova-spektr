import { Asset, AssetType, OrmlExtras, StatemineExtras } from '@renderer/domain/asset';
import { DEFAULT } from '@shared/constants/common';

export const getAssetId = (asset: Asset): string => {
  const assetId = {
    [AssetType.ORML]: () => (asset.typeExtras as OrmlExtras).currencyIdScale,
    [AssetType.STATEMINE]: () => (asset.typeExtras as StatemineExtras).assetId,
    [DEFAULT]: () => asset.assetId.toString(),
  };

  return assetId[asset.type || DEFAULT]();
};

export const getAssetById = (assets: Asset[], id?: string): Asset | undefined =>
  assets.find((a) => getAssetId(a) === id) || assets[0];
