import { useLiveQuery } from 'dexie-react-hooks';
import { AccountInfo, BalanceLock } from '@polkadot/types/interfaces';

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

  const { updateBalance, getBalances, getBalance, getNetworkBalances } = balanceStorage;

  const handleValidation = (balance: Balance, isValid: boolean) => {
    if (isValid) {
      updateBalance({ ...balance, verified: true });
    }
  };

  const getLiveBalance = (publicKey: PublicKey, chainId: ChainId, assetId: string): BalanceDS | undefined => {
    return useLiveQuery(() => getBalance(publicKey, chainId, assetId));
  };

  const getLiveNetworkBalances = (publicKey: PublicKey, chainId: ChainId): BalanceDS[] | undefined => {
    return useLiveQuery(() => getNetworkBalances(publicKey, chainId));
  };

  const subscribeBalanceChange = (
    publicKey: PublicKey,
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    asset: Asset,
  ) => {
    const api = chain.api;
    if (!api) return;

    const address = toAddress(publicKey, chain.addressPrefix);

    return api.query.system.account(address, async (data: AccountInfo) => {
      const balance = {
        publicKey,
        chainId: chain.chainId,
        assetId: asset.assetId.toString(),
        verified: !relaychain,
        free: data.data.free.toString(),
        reserved: data.data.reserved.toString(),
      };

      updateBalance(balance);

      if (relaychain?.api) {
        const storageKey = api.query.system.account.key(address);
        validate(relaychain.api, api, storageKey, data).then((isValid) => handleValidation(balance, isValid));
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
    if (!api) return;

    const address = toAddress(publicKey, chain.addressPrefix);

    return api.query.assets.account(statemineAssetId, address, (data: any) => {
      try {
        const free = data.isNone ? '0' : data.unwrap().balance.toString();
        const balance = {
          publicKey,
          chainId: chain.chainId,
          assetId: asset.assetId.toString(),
          verified: !relaychain,
          free: free.toString(),
          frozen: [],
          reserved: (0).toString(),
        };

        updateBalance(balance);

        if (relaychain?.api) {
          const storageKey = api.query.assets.account.key(statemineAssetId, address);
          validate(relaychain.api, api, storageKey, data).then((isValid) => handleValidation(balance, isValid));
        }
      } catch (e) {
        console.warn(e);
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
    if (!api) return;

    const address = toAddress(publicKey, chain.addressPrefix);

    const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies.accounts;

    return method(address, ormlAssetId, (data: any) => {
      const { free, reserved } = data;
      const balance = {
        publicKey,
        chainId: chain.chainId,
        assetId: asset.assetId.toString(),
        verified: !relaychain,
        free: free.toString(),
        reserved: reserved.toString(),
      };

      updateBalance(balance);

      if (relaychain?.api) {
        const storageKey = method.key(address, ormlAssetId);
        validate(relaychain.api, api, storageKey, data).then((isValid) => handleValidation(balance, isValid));
      }
    });
  };

  const subscribeLockBalanceChange = (publicKey: PublicKey, chain: ExtendedChain, asset: Asset) => {
    const api = chain.api;
    if (!api) return;

    const address = toAddress(publicKey, chain.addressPrefix);

    return api.query.balances.locks(address, async (data: BalanceLock[]) => {
      const balance = {
        publicKey,
        chainId: chain.chainId,
        assetId: asset.assetId.toString(),
        frozen: [
          ...data.map((lock: BalanceLock) => ({
            type: lock.id.toString(),
            amount: lock.amount.toString(),
          })),
        ],
      };

      updateBalance(balance);
    });
  };

  const subscribeLockOrmlAssetChange = async (publicKey: PublicKey, chain: ExtendedChain, asset: Asset) => {
    const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
    const api = chain.api;
    if (!api) return;

    const address = toAddress(publicKey, chain.addressPrefix);

    const method = api.query.tokens ? api.query.tokens.locks : api.query.currencies.locks;

    return method(address, ormlAssetId, (data: BalanceLock[]) => {
      const balance = {
        publicKey,
        chainId: chain.chainId,
        assetId: asset.assetId.toString(),
        frozen: [
          ...data.map((lock: BalanceLock) => ({
            type: lock.id.toString(),
            amount: lock.amount.toString(),
          })),
        ],
      };

      updateBalance(balance);
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

  const subscribeLockBalances = (chain: ExtendedChain, publicKey: PublicKey): Promise<any> => {
    const unsubscribe = chain.assets?.map((asset) => {
      if (!asset.type) {
        return subscribeLockBalanceChange(publicKey, chain, asset);
      }

      if (asset.type === AssetType.ORML) {
        return subscribeLockOrmlAssetChange(publicKey, chain, asset);
      }
    });

    return Promise.all(unsubscribe);
  };

  return {
    getBalances,
    getBalance,
    getLiveBalance,
    getLiveNetworkBalances,
    subscribeBalances,
    subscribeLockBalances,
  };
};
