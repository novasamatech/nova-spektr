import { useLiveQuery } from 'dexie-react-hooks';
import { BalanceLock } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { Codec } from '@polkadot/types/types';
import { Option } from '@polkadot/types';

import { Asset, AssetType, OrmlExtras, StatemineExtras } from '@renderer/domain/asset';
import { ChainID, AccountID } from '@renderer/domain/shared-kernel';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { isLightClient } from '@renderer/services/network/common/utils';
import { validate } from '../dataVerification/dataVerification';
import storage, { BalanceDS } from '../storage';
import { IBalanceService } from './common/types';
import { VERIFY_TIMEOUT } from './common/constants';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { toAddress } from '@renderer/shared/utils/address';

export const useBalance = (): IBalanceService => {
  const balanceStorage = storage.connectTo('balances');

  if (!balanceStorage) {
    throw new Error('=== 🔴 Balances storage in not defined 🔴 ===');
  }

  const validationSubscriptionService = useSubscription<ChainID>();

  const {
    updateBalance,
    getBalances,
    getAllBalances,
    getBalance,
    getNetworkBalances,
    getAssetBalances,
    setBalanceIsValid,
  } = balanceStorage;

  const getLiveBalance = (accountId: AccountID, chainId: ChainID, assetId: string): BalanceDS | undefined => {
    return useLiveQuery(() => getBalance(accountId, chainId, assetId), [accountId, chainId, assetId]);
  };

  const getLiveNetworkBalances = (accountIds: AccountID[], chainId: ChainID): BalanceDS[] => {
    const query = () => {
      return getNetworkBalances(accountIds, chainId);
    };

    return useLiveQuery(query, [accountIds.length, chainId], []);
  };

  const getLiveAssetBalances = (accountIds: AccountID[], chainId: ChainID, assetId: string): BalanceDS[] => {
    const query = () => {
      return getAssetBalances(accountIds, chainId, assetId);
    };

    return useLiveQuery(query, [accountIds.length, chainId, assetId], []);
  };

  const getLiveBalances = (accountIds: AccountID[]): BalanceDS[] => {
    const query = () => {
      return getBalances(accountIds);
    };

    return useLiveQuery(query, [accountIds.length], []);
  };

  const runValidation = async (
    relaychainApi: ApiPromise,
    parachainApi: ApiPromise,
    storageKey: string,
    data: Codec,
    onValid?: () => void,
    onInvalid?: () => void,
  ) => {
    const chainId = parachainApi.genesisHash.toHex();

    if (relaychainApi.isConnected && parachainApi.isConnected) {
      const isValid = await validate(relaychainApi, parachainApi, storageKey, data);

      if (isValid) {
        await onValid?.();
      } else {
        const timeoutId = setTimeout(
          () => runValidation(relaychainApi, parachainApi, storageKey, data, onValid, onInvalid),
          VERIFY_TIMEOUT,
        );

        validationSubscriptionService.subscribe(chainId, () => {
          clearTimeout(timeoutId);
        });

        await onInvalid?.();
      }
    } else {
      const timeoutId = setTimeout(
        () => runValidation(relaychainApi, parachainApi, storageKey, data, onValid, onInvalid),
        VERIFY_TIMEOUT,
      );

      validationSubscriptionService.subscribe(chainId, () => {
        clearTimeout(timeoutId);
      });
    }
  };

  const subscribeBalancesChange = (
    accountIds: AccountID[],
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    asset: Asset,
  ) => {
    const api = chain.api;
    if (!api) return;

    const addresses = accountIds.map((accointId) => toAddress(accointId, { prefix: chain.addressPrefix }));

    return api.query.system.account.multi(addresses, (data: any[]) => {
      data.forEach(async (accountInfo, i) => {
        const miscFrozen = new BN(accountInfo.data.miscFrozen);
        const feeFrozen = new BN(accountInfo.data.feeFrozen);

        const balance = {
          accountId: accountIds[i],
          chainId: chain.chainId,
          assetId: asset.assetId.toString(),
          verified: true,
          free: accountInfo.data.free.toString(),
          frozen: miscFrozen.gt(feeFrozen) ? miscFrozen.toString() : feeFrozen.toString(),
          reserved: accountInfo.data.reserved.toString(),
        };

        await updateBalance(balance);

        if (relaychain?.api && isLightClient(relaychain)) {
          const storageKey = api.query.system.account.key(addresses[i]);
          runValidation(
            relaychain.api,
            api,
            storageKey,
            accountInfo,
            () => setBalanceIsValid(balance, true),
            () => setBalanceIsValid(balance, false),
          );
        }
      });
    });
  };

  const subscribeStatemineAssetsChange = (
    accountIds: AccountID[],
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    asset: Asset,
  ) => {
    const statemineAssetId = (asset?.typeExtras as StatemineExtras).assetId;
    const api = chain.api;
    if (!api) return;

    const addresses = accountIds.map((accountId) => toAddress(accountId, { prefix: chain.addressPrefix }));

    return api.query.assets.account.multi(
      addresses.map((a) => [statemineAssetId, a]),
      (data: any[]) => {
        data.forEach(async (accountInfo: Option<any>, i) => {
          try {
            const free = accountInfo.isNone ? '0' : accountInfo.unwrap().balance.toString();
            const balance = {
              accountId: accountIds[i],
              chainId: chain.chainId,
              assetId: asset.assetId.toString(),
              verified: true,
              free: free.toString(),
              frozen: (0).toString(),
              reserved: (0).toString(),
            };

            await updateBalance(balance);

            if (relaychain?.api && isLightClient(relaychain)) {
              const storageKey = api.query.assets.account.key(statemineAssetId, addresses[i]);
              runValidation(
                relaychain.api,
                api,
                storageKey,
                accountInfo,
                () => setBalanceIsValid(balance, true),
                () => setBalanceIsValid(balance, false),
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
    accountIds: AccountID[],
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    asset: Asset,
  ) => {
    const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
    const api = chain.api;
    if (!api) return;

    const addresses = accountIds.map((accountId) => toAddress(accountId, { prefix: chain.addressPrefix }));

    const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies.accounts;

    return method.multi(
      addresses.map((a) => [a, ormlAssetId]),
      (data: any[]) => {
        data.forEach(async (accountInfo: any, i) => {
          const { free, reserved, frozen } = accountInfo;
          const balance = {
            accountId: accountIds[i],
            chainId: chain.chainId,
            assetId: asset.assetId.toString(),
            verified: true,
            free: free.toString(),
            frozen: frozen.toString(),
            reserved: reserved.toString(),
          };

          await updateBalance(balance);

          if (relaychain?.api && isLightClient(relaychain)) {
            const storageKey = method.key(addresses[i], ormlAssetId);
            runValidation(
              relaychain.api,
              api,
              storageKey,
              accountInfo,
              () => setBalanceIsValid(balance, true),
              () => setBalanceIsValid(balance, false),
            );
          }
        });
      },
    );
  };

  const subscribeLockBalanceChange = (accountIds: AccountID[], chain: ExtendedChain, asset: Asset) => {
    const api = chain.api;
    if (!api) return;

    const addresses = accountIds.map((accountId) => toAddress(accountId, { prefix: chain.addressPrefix }));

    return api.query.balances.locks.multi(addresses, (balanceLocks: any[]) => {
      balanceLocks.forEach(async (balanceLock, i) => {
        const balance = {
          accountId: accountIds[i],
          chainId: chain.chainId,
          assetId: asset.assetId.toString(),
          locked: [
            ...balanceLock.map((lock: BalanceLock) => ({
              type: lock.id.toString(),
              amount: lock.amount.toString(),
            })),
          ],
        };

        await updateBalance(balance);
      });
    });
  };

  const subscribeLockOrmlAssetChange = async (accountIds: AccountID[], chain: ExtendedChain, asset: Asset) => {
    const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
    const api = chain.api;
    if (!api) return;

    const addresses = accountIds.map((accountId) => toAddress(accountId, { prefix: chain.addressPrefix }));

    const method = api.query.tokens ? api.query.tokens.locks : api.query.currencies.locks;

    return method.multi(
      addresses.map((a) => [a, ormlAssetId]),
      (balanceLocks: any[]) => {
        balanceLocks.forEach(async (balanceLock, i) => {
          const balance = {
            accountId: accountIds[i],
            chainId: chain.chainId,
            assetId: asset.assetId.toString(),
            locked: [
              ...balanceLock.map((lock: BalanceLock) => ({
                type: lock.id.toString(),
                amount: lock.amount.toString(),
              })),
            ],
          };

          await updateBalance(balance);
        });
      },
    );
  };

  const subscribeBalances = (
    chain: ExtendedChain,
    relaychain: ExtendedChain | undefined,
    accountIds: AccountID[],
  ): Promise<any> => {
    const unsubscribeBalances = chain.assets?.map((asset) => {
      if (!asset.type) {
        return subscribeBalancesChange(accountIds, chain, relaychain, asset);
      }

      if (asset.type === AssetType.STATEMINE) {
        return subscribeStatemineAssetsChange(accountIds, chain, relaychain, asset);
      }

      if (asset.type === AssetType.ORML) {
        return subscribeOrmlAssetsChange(accountIds, chain, relaychain, asset);
      }
    });

    return Promise.all([...unsubscribeBalances, () => validationSubscriptionService.unsubscribe(chain.chainId)]);
  };

  const subscribeLockBalances = (chain: ExtendedChain, accountIds: AccountID[]): Promise<any> => {
    const unsubscribe = chain.assets?.map((asset) => {
      if (!asset.type) {
        return subscribeLockBalanceChange(accountIds, chain, asset);
      }

      if (asset.type === AssetType.ORML) {
        return subscribeLockOrmlAssetChange(accountIds, chain, asset);
      }
    });

    return Promise.all(unsubscribe.flat());
  };

  return {
    getAllBalances,
    getBalances,
    getBalance,
    getLiveAssetBalances,
    getAssetBalances,
    getLiveBalance,
    getLiveBalances,
    getNetworkBalances,
    getLiveNetworkBalances,
    subscribeBalances,
    subscribeLockBalances,
  };
};
