import { HexString } from '@renderer/domain/types';
import { Asset, AssetType, ExtendedChain, OrmlExtras, StatemineExtras } from '../network/common/types';
import { useBalanceStorage } from './balanceStorage';
import { IBalanceService } from './common/types';
import { toAddress } from './common/utils';

export const useBalance = (): IBalanceService => {
  const { updateBalance, getBalances, getBalance } = useBalanceStorage();

  const subscribeBalanceChange = (publicKey: HexString, chain: ExtendedChain, asset: Asset) => {
    const api = chain.api;
    const address = toAddress(publicKey, chain.addressPrefix);

    return api.query.system.account(address, (data: any) => {
      updateBalance({
        publicKey,
        chainId: chain.chainId,
        assetId: asset.assetId.toString(),
        free: data.data.free.toString(),
        reserved: data.data.free.toString(),
        frozen: data.data.feeFrozen.toString(),
      });
    });
  };

  const subscribeStatemineAssetChange = (publicKey: HexString, chain: ExtendedChain, asset: Asset) => {
    const statemineAssetId = (asset?.typeExtras as StatemineExtras).assetId;
    const api = chain.api;
    const address = toAddress(publicKey, chain.addressPrefix);

    return api.query.assets.account(statemineAssetId, address, (data: any) => {
      const free = data.isNone ? '0' : data.unwrap().balance.toString();

      updateBalance({
        publicKey,
        chainId: chain.chainId,
        assetId: asset.assetId.toString(),
        free: free.toString(),
        reserved: (0).toString(),
        frozen: (0).toString(),
      });
    });
  };

  const subscribeOrmlAssetChange = async (publicKey: HexString, chain: ExtendedChain, asset: Asset) => {
    const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
    const api = chain.api;
    const address = toAddress(publicKey, chain.addressPrefix);

    const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies.accounts;

    return method(address, ormlAssetId, (data: any) => {
      const { free, frozen, reserved } = data;

      updateBalance({
        publicKey,
        chainId: chain.chainId,
        assetId: asset.assetId.toString(),
        free: free.toString(),
        reserved: frozen.toString(),
        frozen: reserved.toString(),
      });
    });
  };

  return {
    getBalances,
    getBalance,
    subscribeBalances: (chain: ExtendedChain, publicKey: HexString): Promise<any> => {
      const unsubscribe = chain.assets?.map((asset) => {
        if (!asset.type) {
          return subscribeBalanceChange(publicKey, chain, asset);
        }

        if (asset.type === AssetType.STATEMINE) {
          return subscribeStatemineAssetChange(publicKey, chain, asset);
        }

        if (asset.type === AssetType.ORML) {
          return subscribeOrmlAssetChange(publicKey, chain, asset);
        }
      });

      return Promise.all(unsubscribe);
    },
  };
};
