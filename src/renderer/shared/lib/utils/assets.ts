import {
  type Asset,
  type AssetId,
  AssetType,
  type OrmlExtras,
  StakingType,
  type StatemineExtras,
} from '@/shared/core/types/asset';
import { assert } from '@/shared/lib/utils';

/**
 * Asset id as seen by the chain. Useful when we want to transact specifying
 * this asset. Note that this can have different type depending on the type of
 * the corresponding asset
 */
export type OnChainAssetId = string | number | 'Native';

export const getNativeAsset = (assets: Asset[]): Asset => {
  const nativeId = getNativeAssetId();
  const nativeAsset = assets.find((asset) => asset.assetId == nativeId);
  assert(nativeAsset, 'Native asset is not found');
  return nativeAsset;
};

export const getNativeAssetId = (): AssetId => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return 0 as AssetId;
};

export const isNativeAsset = (asset: Asset): boolean => {
  return getNativeAssetId() === asset.assetId;
};

export const getOnChainAssetId = (asset: Asset): OnChainAssetId => {
  const type = asset.type;
  switch (type) {
    case AssetType.NATIVE:
      return 'Native';
    case AssetType.ORML:
      return (asset.typeExtras as OrmlExtras).currencyIdScale;
    case AssetType.STATEMINE:
      return (asset.typeExtras as StatemineExtras).assetId;
    default:
      throw type satisfies never;
  }
};

/**
 * Get asset by ID
 *
 * @param assets Network assets
 * @param id Identifier to be searched
 *
 * @returns {Asset | undefined}
 */
export const getAssetByOnChainId = (id: OnChainAssetId, assets: Asset[]): Asset | null => {
  if (!assets || assets.length === 0) return null;

  const res = assets.find((asset) => getOnChainAssetId(asset) === id);
  if (res) {
    return res;
  } else {
    return null;
  }
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
