import { useLiveQuery } from 'dexie-react-hooks';

import storage, { BalanceDS } from '../storage';
import { Balance } from '@renderer/domain/balance';
import { ChainId, PublicKey } from '@renderer/domain/shared-kernel';
import { validate } from '../dataVerification/dataVerification';
import { Asset, AssetType, ExtendedChain, OrmlExtras, StatemineExtras } from '../network/common/types';
import { IBalanceService } from './common/types';
import { toAddress } from './common/utils';

export const useBalance = (): IBalanceService => {
  const balanceStorage = storage.connectTo('balances');

  if (!balanceStorage) {
    throw new Error('=== 🔴 Balances storage in not defined 🔴 ===');
  }

  const { updateBalance, getBalances, getBalance } = balanceStorage;

  const handleValidation = (balance: Balance, isValid: boolean) => {
    if (isValid) {
      updateBalance({ ...balance, verified: true });
    }
  };

  const getLiveBalance = (publicKey: PublicKey, chainId: ChainId, assetId: string): BalanceDS | undefined => {
    return useLiveQuery(() => getBalance(publicKey, chainId, assetId));
  };

  const subscribeBalanceChange = (
    publicKey: PublicKey,
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    asset: Asset,
  ) => {
    const api = chain.api;
    const address = toAddress(publicKey, chain.addressPrefix);

    return api.query.system.account(address, (data: any) => {
      const balance = {
        publicKey,
        chainId: chain.chainId,
        assetId: asset.assetId.toString(),
        verified: !relaychain,
        free: data.data.free.toString(),
        reserved: data.data.free.toString(),
        frozen: data.data.feeFrozen.toString(),
      };

      updateBalance(balance);

      if (relaychain) {
        const storageKey = api.query.system.account.key(address);
        validate(relaychain.api, chain.api, storageKey, data).then((isValid) => handleValidation(balance, isValid));
      }
    });
  };

  const subscribeStatemineAssetChange = (
    publicKey: PublicKey,
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    asset: Asset,
  ) => {
    const statemineAssetId = (asset?.typeExtras as StatemineExtras).assetId;
    const api = chain.api;
    const address = toAddress(publicKey, chain.addressPrefix);

    return api.query.assets.account(statemineAssetId, address, (data: any) => {
      const free = data.isNone ? '0' : data.unwrap().balance.toString();
      const balance = {
        publicKey,
        chainId: chain.chainId,
        assetId: asset.assetId.toString(),
        verified: !relaychain,
        free: free.toString(),
        reserved: (0).toString(),
        frozen: (0).toString(),
      };

      updateBalance(balance);

      if (relaychain) {
        const storageKey = api.query.assets.account.key(statemineAssetId, address);
        validate(relaychain.api, chain.api, storageKey, data).then((isValid) => handleValidation(balance, isValid));
      }
    });
  };

  const subscribeOrmlAssetChange = async (
    publicKey: PublicKey,
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    asset: Asset,
  ) => {
    const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
    const api = chain.api;
    const address = toAddress(publicKey, chain.addressPrefix);

    const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies.accounts;

    return method(address, ormlAssetId, (data: any) => {
      const { free, frozen, reserved } = data;
      const balance = {
        publicKey,
        chainId: chain.chainId,
        assetId: asset.assetId.toString(),
        verified: !relaychain,
        free: free.toString(),
        reserved: frozen.toString(),
        frozen: reserved.toString(),
      };

      updateBalance(balance);

      if (relaychain) {
        const storageKey = method.key(address, ormlAssetId);
        validate(relaychain.api, chain.api, storageKey, data).then((isValid) => handleValidation(balance, isValid));
      }
    });
  };

  const subscribeBalances = (
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    publicKey: PublicKey,
  ): Promise<any> => {
    const unsubscribe = chain.assets?.map((asset) => {
      if (!asset.type) {
        return subscribeBalanceChange(publicKey, chain, relaychain, asset);
      }

      if (asset.type === AssetType.STATEMINE) {
        return subscribeStatemineAssetChange(publicKey, chain, relaychain, asset);
      }

      if (asset.type === AssetType.ORML) {
        return subscribeOrmlAssetChange(publicKey, chain, relaychain, asset);
      }
    });

    return Promise.all(unsubscribe);
  };

  return {
    getBalances,
    getBalance,
    getLiveBalance,
    subscribeBalances,
  };
};
