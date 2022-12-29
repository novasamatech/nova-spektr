import { useLiveQuery } from 'dexie-react-hooks';
import { AccountInfo, BalanceLock } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { Codec } from '@polkadot/types/types';

import { Asset, AssetType, OrmlExtras, StatemineExtras } from '@renderer/domain/asset';
import { Balance } from '@renderer/domain/balance';
import { ChainId, PublicKey } from '@renderer/domain/shared-kernel';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { isLightClient } from '@renderer/services/network/common/utils';
import { validate } from '../dataVerification/dataVerification';
import storage, { BalanceDS } from '../storage';
import { IBalanceService } from './common/types';
import { toAddress } from './common/utils';
import { VERIFY_TIMEOUT } from './common/constants';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';

export const useBalance = (): IBalanceService => {
  const balanceStorage = storage.connectTo('balances');

  if (!balanceStorage) {
    throw new Error('=== 🔴 Balances storage in not defined 🔴 ===');
  }

  const validationSubscriptionService = useSubscription<ChainId>();

  const { updateBalance, getBalances, getAllBalances, getBalance, getNetworkBalances } = balanceStorage;

  const handleValidation = (balance: Balance, isValid: boolean) => {
    if (!isValid) {
      updateBalance({ ...balance, verified: false });
    }
  };

  const getLiveBalance = (publicKey: PublicKey, chainId: ChainId, assetId: string): BalanceDS | undefined => {
    return useLiveQuery(() => getBalance(publicKey, chainId, assetId), [publicKey, chainId, assetId]);
  };

  const getLiveNetworkBalances = (publicKeys: PublicKey[], chainId: ChainId): BalanceDS[] => {
    const query = () => {
      return getNetworkBalances(publicKeys, chainId);
    };

    return useLiveQuery(query, [publicKeys.length, chainId], []);
  };

  const getLiveBalances = (publicKeys: PublicKey[]): BalanceDS[] => {
    const query = () => {
      return getBalances(publicKeys);
    };

    return useLiveQuery(query, [publicKeys.length], []);
  };

  const runValidation = async (
    relaychainApi: ApiPromise,
    parachainApi: ApiPromise,
    storageKey: string,
    data: Codec,
    onValid?: () => void,
    onInvalid?: () => void,
  ) => {
    const isValid = await validate(relaychainApi, parachainApi, storageKey, data);

    if (isValid) {
      onValid?.();
    } else {
      onInvalid?.();

      const chainId = parachainApi.genesisHash.toHex();
      await validationSubscriptionService.unsubscribe(chainId);

      const timeoutId = setTimeout(async () => {
        if (relaychainApi.isConnected && parachainApi.isConnected) {
          runValidation(relaychainApi, parachainApi, storageKey, data, onValid, onInvalid);
        }
      }, VERIFY_TIMEOUT);

      validationSubscriptionService.subscribe(chainId, () => {
        clearTimeout(timeoutId);
      });
    }
  };

  const subscribeBalancesChange = (
    publicKeys: PublicKey[],
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    asset: Asset,
  ) => {
    const api = chain.api;
    if (!api) return;

    const addresses = publicKeys.map((pk) => toAddress(pk, chain.addressPrefix));

    return api.query.system.account.multi(addresses, (data: AccountInfo[]) => {
      data.forEach((accountInfo, i) => {
        const miscFrozen = new BN(accountInfo.data.miscFrozen);
        const feeFrozen = new BN(accountInfo.data.feeFrozen);

        const balance = {
          publicKey: publicKeys[i],
          chainId: chain.chainId,
          assetId: asset.assetId.toString(),
          verified: true,
          free: accountInfo.data.free.toString(),
          frozen: miscFrozen.gt(feeFrozen) ? miscFrozen.toString() : feeFrozen.toString(),
          reserved: accountInfo.data.reserved.toString(),
        };

        updateBalance(balance);

        if (relaychain?.api && isLightClient(relaychain)) {
          const storageKey = api.query.system.account.key(addresses[i]);
          runValidation(
            relaychain.api,
            api,
            storageKey,
            accountInfo,
            () => handleValidation(balance, true),
            () => handleValidation(balance, false),
          );
        }
      });
    });
  };

  const subscribeStatemineAssetsChange = (
    publicKeys: PublicKey[],
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    asset: Asset,
  ) => {
    const statemineAssetId = (asset?.typeExtras as StatemineExtras).assetId;
    const api = chain.api;
    if (!api) return;

    const addresses = publicKeys.map((pk) => toAddress(pk, chain.addressPrefix));

    return api.query.assets.account.multi(
      addresses.map((a) => [statemineAssetId, a]),
      (data: any[]) => {
        data.forEach((accountInfo, i) => {
          try {
            const free = accountInfo.isNone ? '0' : accountInfo.unwrap().balance.toString();
            const balance = {
              publicKey: publicKeys[i],
              chainId: chain.chainId,
              assetId: asset.assetId.toString(),
              verified: true,
              free: free.toString(),
              frozen: (0).toString(),
              reserved: (0).toString(),
            };

            updateBalance(balance);

            if (relaychain?.api && isLightClient(relaychain)) {
              const storageKey = api.query.assets.account.key(statemineAssetId, addresses[i]);
              runValidation(
                relaychain.api,
                api,
                storageKey,
                accountInfo,
                () => handleValidation(balance, true),
                () => handleValidation(balance, false),
              );
            }
          } catch (e) {
            console.warn(e);
          }
        });
      },
    );
  };

  const subscribeOrmlAssetsChange = async (
    publicKeys: PublicKey[],
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    asset: Asset,
  ) => {
    const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
    const api = chain.api;
    if (!api) return;

    const addresses = publicKeys.map((pk) => toAddress(pk, chain.addressPrefix));

    const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies.accounts;

    return method.multi(
      addresses.map((a) => [a, ormlAssetId]),
      (data: any[]) => {
        data.forEach((accountInfo, i) => {
          const { free, reserved, frozen } = accountInfo;
          const balance = {
            publicKey: publicKeys[i],
            chainId: chain.chainId,
            assetId: asset.assetId.toString(),
            verified: true,
            free: free.toString(),
            frozen: frozen.toString(),
            reserved: reserved.toString(),
          };

          updateBalance(balance);

          if (relaychain?.api && isLightClient(relaychain)) {
            const storageKey = method.key(addresses[i], ormlAssetId);
            runValidation(
              relaychain.api,
              api,
              storageKey,
              accountInfo,
              () => handleValidation(balance, true),
              () => handleValidation(balance, false),
            );
          }
        });
      },
    );
  };

  const subscribeLockBalanceChange = (publicKeys: PublicKey[], chain: ExtendedChain, asset: Asset) => {
    const api = chain.api;
    if (!api) return;

    const addresses = publicKeys.map((pk) => toAddress(pk, chain.addressPrefix));

    return api.query.balances.locks.multi(addresses, (balanceLocks: any[]) => {
      balanceLocks.forEach((balanceLock, i) => {
        const balance = {
          publicKey: publicKeys[i],
          chainId: chain.chainId,
          assetId: asset.assetId.toString(),
          locked: [
            ...balanceLock.map((lock: BalanceLock) => ({
              type: lock.id.toString(),
              amount: lock.amount.toString(),
            })),
          ],
        };

        updateBalance(balance);
      });
    });
  };

  const subscribeLockOrmlAssetChange = async (publicKeys: PublicKey[], chain: ExtendedChain, asset: Asset) => {
    const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
    const api = chain.api;
    if (!api) return;

    const addresses = publicKeys.map((pk) => toAddress(pk, chain.addressPrefix));

    const method = api.query.tokens ? api.query.tokens.locks : api.query.currencies.locks;

    return method.multi(
      addresses.map((a) => [a, ormlAssetId]),
      (balanceLocks: any[]) => {
        balanceLocks.forEach((balanceLock, i) => {
          const balance = {
            publicKey: publicKeys[i],
            chainId: chain.chainId,
            assetId: asset.assetId.toString(),
            locked: [
              ...balanceLock.map((lock: BalanceLock) => ({
                type: lock.id.toString(),
                amount: lock.amount.toString(),
              })),
            ],
          };

          updateBalance(balance);
        });
      },
    );
  };

  const subscribeBalances = (
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    publicKeys: PublicKey[],
  ): Promise<any> => {
    const unsubscribeBalances = chain.assets?.map((asset) => {
      if (!asset.type) {
        return subscribeBalancesChange(publicKeys, chain, relaychain, asset);
      }

      if (asset.type === AssetType.STATEMINE) {
        return subscribeStatemineAssetsChange(publicKeys, chain, relaychain, asset);
      }

      if (asset.type === AssetType.ORML) {
        return subscribeOrmlAssetsChange(publicKeys, chain, relaychain, asset);
      }
    });

    return Promise.all([...unsubscribeBalances, () => validationSubscriptionService.unsubscribe(chain.chainId)]);
  };

  const subscribeLockBalances = (chain: ExtendedChain, publicKeys: PublicKey[]): Promise<any> => {
    const unsubscribe = chain.assets?.map((asset) => {
      if (!asset.type) {
        return subscribeLockBalanceChange(publicKeys, chain, asset);
      }

      if (asset.type === AssetType.ORML) {
        return subscribeLockOrmlAssetChange(publicKeys, chain, asset);
      }
    });

    return Promise.all(unsubscribe.flat());
  };

  return {
    getAllBalances,
    getBalances,
    getBalance,
    getLiveBalance,
    getLiveBalances,
    getNetworkBalances,
    getLiveNetworkBalances,
    subscribeBalances,
    subscribeLockBalances,
  };
};
