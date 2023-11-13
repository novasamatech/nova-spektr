import { useLiveQuery } from 'dexie-react-hooks';
import { BalanceLock } from '@polkadot/types/interfaces';
import { BN, hexToU8a } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { Codec } from '@polkadot/types/types';
import { UnsubscribePromise, VoidFn } from '@polkadot/api/types';
import { Mutex } from 'async-mutex';
import noop from 'lodash/noop';

import { ExtendedChain } from '@renderer/entities/network/lib/common/types';
import { validate } from '@renderer/services/dataVerification/dataVerification';
import { IBalanceService } from './common/types';
import { VERIFY_TIMEOUT } from './common/constants';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { getAssetId, toAddress } from '@shared/lib/utils';
import { BalanceDS, storage } from '@renderer/shared/api/storage';
import { AssetType } from '@shared/core';
import type { AccountId, Address, Asset, ChainId, OrmlExtras, Balance } from '@shared/core';

const mutex = new Mutex();

export const useBalance = (): IBalanceService => {
  const balanceStorage = storage.connectTo('balances');

  if (!balanceStorage) {
    throw new Error('=== 🔴 Balances storage in not defined 🔴 ===');
  }

  const validationSubscriptionService = useSubscription<ChainId>();

  const {
    getBalances,
    getAllBalances,
    getBalance,
    getNetworkBalances,
    getAssetBalances,
    setBalanceIsValid,
    insertBalances,
  } = balanceStorage;

  const getLiveBalance = (accountId: AccountId, chainId: ChainId, assetId: string): BalanceDS | undefined => {
    return useLiveQuery(() => getBalance(accountId, chainId, assetId), [accountId, chainId, assetId]);
  };

  const getLiveNetworkBalances = (accountIds: AccountId[], chainId: ChainId): BalanceDS[] => {
    const query = () => {
      return getNetworkBalances(accountIds, chainId);
    };

    return useLiveQuery(query, [accountIds.length, accountIds.length > 0 && accountIds[0], chainId], []);
  };

  const getLiveAssetBalances = (accountIds: AccountId[], chainId: ChainId, assetId: string): BalanceDS[] => {
    const query = () => {
      return getAssetBalances(accountIds, chainId, assetId);
    };

    return useLiveQuery(query, [accountIds.length, chainId, assetId], []);
  };

  const getLiveBalances = (accountIds: AccountId[]): BalanceDS[] => {
    const query = () => {
      return getBalances(accountIds);
    };

    return useLiveQuery(query, [accountIds.length, accountIds[0]], []);
  };

  const getRepeatedIndex = (index: number, base: number): number => {
    return Math.floor(index / base);
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

  const insertNewBalances = (accountIds: AccountId[], chainId: ChainId, values: Balance[]) => {
    mutex
      .runExclusive(async () => {
        const balances = await getNetworkBalances(accountIds, chainId);

        const balanceWithLock = values.map((balance: Balance) => {
          const match = balances.find((b) => {
            const isSameAccount = b.accountId === balance.accountId;
            const isSameAssetId = b.assetId === balance.assetId;

            return isSameAccount && isSameAssetId;
          });

          return match ? { ...match, ...balance } : balance;
        });

        await insertBalances(balanceWithLock);
      })
      .catch(() => console.log(`Error trying to update balance for ${chainId}`));
  };

  const subscribeBalancesChange = (
    accountIds: AccountId[],
    chain: ExtendedChain,
    assetId?: number,
    relaychain?: ExtendedChain,
  ): UnsubscribePromise => {
    const api = chain.api;
    if (!api || assetId === undefined) return Promise.resolve(noop);

    const addresses = accountIds.map((accountId) => toAddress(accountId, { prefix: chain.addressPrefix }));

    return api.query.system.account.multi(addresses, (data: any[]) => {
      const newBalances = data.reduce((acc, accountInfo, index) => {
        let frozen: string;

        if (accountInfo.data.miscFrozen || accountInfo.data.feeFrozen) {
          const miscFrozen = new BN(accountInfo.data.miscFrozen);
          const feeFrozen = new BN(accountInfo.data.feeFrozen);
          frozen = miscFrozen.gt(feeFrozen) ? miscFrozen.toString() : feeFrozen.toString();
        } else {
          frozen = new BN(accountInfo.data.frozen).toString();
        }

        acc.push({
          accountId: accountIds[index],
          chainId: chain.chainId,
          assetId: assetId.toString(),
          verified: true,
          free: accountInfo.data.free.toString(),
          reserved: accountInfo.data.reserved.toString(),
          frozen,
        });

        // if (relaychain?.api && isLightClient(relaychain)) {
        //   const storageKey = api.query.system.account.key(addresses[i]);
        //   runValidation(
        //     relaychain.api,
        //     api,
        //     storageKey,
        //     accountInfo,
        //     () => setBalanceIsValid(balance, true),
        //     () => setBalanceIsValid(balance, false),
        //   );
        // }

        return acc;
      }, []);

      insertNewBalances(accountIds, chain.chainId, newBalances);
    });
  };

  const subscribeStatemineAssetsChange = (
    accountIds: AccountId[],
    chain: ExtendedChain,
    assets: Asset[],
    relaychain?: ExtendedChain,
  ): UnsubscribePromise => {
    const api = chain.api;
    if (!api || !assets.length) return Promise.resolve(noop);

    const assetsTuples = assets.reduce<[string, Address][]>((acc, asset) => {
      accountIds.forEach((accountId) => {
        acc.push([getAssetId(asset), toAddress(accountId, { prefix: chain.addressPrefix })]);
      });

      return acc;
    }, []);

    return api.query.assets.account.multi(assetsTuples, (data: any[]) => {
      const newBalances = data.reduce((acc, accountInfo, index) => {
        const free = accountInfo.isNone ? '0' : accountInfo.unwrap().balance.toString();
        const accountIndex = index % accountIds.length;
        const assetIndex = getRepeatedIndex(index, accountIds.length);

        acc.push({
          accountId: accountIds[accountIndex],
          chainId: chain.chainId,
          assetId: assets[assetIndex].assetId.toString(),
          verified: true,
          frozen: (0).toString(),
          reserved: (0).toString(),
          free,
        });

        // if (relaychain?.api && isLightClient(relaychain)) {
        //   const storageKey = api.query.assets.account.key(statemineAssetId, addresses[i]);
        //   runValidation(
        //     relaychain.api,
        //     api,
        //     storageKey,
        //     accountInfo,
        //     () => setBalanceIsValid(balance, true),
        //     () => setBalanceIsValid(balance, false),
        //   );
        // }

        return acc;
      }, []);

      insertNewBalances(accountIds, chain.chainId, newBalances);
    });
  };

  const getOrmlAssetTuples = (
    api: ApiPromise,
    accountIds: AccountId[],
    assets: Asset[],
    addressPrefix: number,
  ): [Address, Codec][] => {
    return assets.reduce<[Address, Codec][]>((acc, asset) => {
      const currencyIdType = (asset?.typeExtras as OrmlExtras).currencyIdType;
      const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
      const assetId = api.createType(currencyIdType, hexToU8a(ormlAssetId));

      accountIds.forEach((accountId) => {
        acc.push([toAddress(accountId, { prefix: addressPrefix }), assetId]);
      });

      return acc;
    }, []);
  };

  const subscribeOrmlAssetsChange = (
    accountIds: AccountId[],
    chain: ExtendedChain,
    assets: Asset[],
    relaychain?: ExtendedChain,
  ): UnsubscribePromise => {
    const api = chain.api;
    if (!api || !assets.length) return Promise.resolve(noop);

    const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies.accounts;
    const assetsTuples = getOrmlAssetTuples(api, accountIds, assets, chain.addressPrefix);

    return method.multi(assetsTuples, (data: any[]) => {
      const newBalances = data.reduce((acc, accountInfo, index) => {
        const accountIndex = index % accountIds.length;
        const assetIndex = getRepeatedIndex(index, accountIds.length);

        acc.push({
          accountId: accountIds[accountIndex],
          chainId: chain.chainId,
          assetId: assets[assetIndex].assetId.toString(),
          verified: true,
          free: accountInfo.free.toString(),
          frozen: accountInfo.frozen.toString(),
          reserved: accountInfo.reserved.toString(),
        });

        // if (relaychain?.api && isLightClient(relaychain)) {
        //   const storageKey = method.key(addresses[i], ormlAssetId);
        //   runValidation(
        //     relaychain.api,
        //     api,
        //     storageKey,
        //     accountInfo,
        //     () => setBalanceIsValid(balance, true),
        //     () => setBalanceIsValid(balance, false),
        //   );
        // }

        return acc;
      }, []);

      insertNewBalances(accountIds, chain.chainId, newBalances);
    });
  };

  const subscribeLockBalanceChange = (
    accountIds: AccountId[],
    chain: ExtendedChain,
    assetId?: number,
  ): UnsubscribePromise => {
    const api = chain.api;
    if (!api || assetId === undefined) return Promise.resolve(noop);

    const addresses = accountIds.map((accountId) => toAddress(accountId, { prefix: chain.addressPrefix }));

    return api.query.balances.locks.multi(addresses, (data: any[]) => {
      const newLocks = data.reduce((acc, balanceLock, index) => {
        const locked = balanceLock.map((lock: BalanceLock) => ({
          type: lock.id.toString(),
          amount: lock.amount.toString(),
        }));

        acc.push({
          accountId: accountIds[index],
          chainId: chain.chainId,
          assetId: assetId.toString(),
          locked,
        });

        return acc;
      }, []);

      insertNewBalances(accountIds, chain.chainId, newLocks);
    });
  };

  const subscribeLockOrmlAssetChange = (
    accountIds: AccountId[],
    chain: ExtendedChain,
    assets: Asset[],
  ): UnsubscribePromise => {
    const api = chain.api;
    if (!api || !assets.length) return Promise.resolve(noop);

    const method = api.query.tokens ? api.query.tokens.locks : api.query.currencies.locks;
    const assetsTuples = getOrmlAssetTuples(api, accountIds, assets, chain.addressPrefix);

    return method.multi(assetsTuples, (data: any[]) => {
      const newLocks = data.reduce((acc, balanceLock, index) => {
        const accountIndex = index % accountIds.length;
        const assetIndex = getRepeatedIndex(index, accountIds.length);

        const locked = balanceLock.map((lock: BalanceLock) => ({
          type: lock.id.toString(),
          amount: lock.amount.toString(),
        }));

        acc.push({
          accountId: accountIds[accountIndex],
          chainId: chain.chainId,
          assetId: assets[assetIndex].assetId.toString(),
          locked,
        });

        return acc;
      }, []);

      insertNewBalances(accountIds, chain.chainId, newLocks);
    });
  };

  const subscribeBalances = (
    chain: ExtendedChain,
    accountIds: AccountId[],
    relaychain?: ExtendedChain,
  ): Promise<VoidFn[]> => {
    const { nativeAsset, statemineAssets, ormlAssets } = chain.assets.reduce<{
      nativeAsset?: Asset;
      statemineAssets: Asset[];
      ormlAssets: Asset[];
    }>(
      (acc, asset) => {
        if (!asset.type) acc.nativeAsset = asset;
        if (asset.type === AssetType.STATEMINE) acc.statemineAssets.push(asset);
        if (asset.type === AssetType.ORML) acc.ormlAssets.push(asset);

        return acc;
      },
      { nativeAsset: undefined, statemineAssets: [], ormlAssets: [] },
    );

    return Promise.all([
      subscribeBalancesChange(accountIds, chain, nativeAsset?.assetId, relaychain),
      subscribeStatemineAssetsChange(accountIds, chain, statemineAssets, relaychain),
      subscribeOrmlAssetsChange(accountIds, chain, ormlAssets, relaychain),
      () => validationSubscriptionService.unsubscribe(chain.chainId),
    ]);
  };

  const subscribeLockBalances = (chain: ExtendedChain, accountIds: AccountId[]): Promise<VoidFn[]> => {
    const { nativeAsset, ormlAssets } = chain.assets.reduce<{ nativeAsset?: Asset; ormlAssets: Asset[] }>(
      (acc, asset) => {
        if (!asset.type) acc.nativeAsset = asset;
        if (asset.type === AssetType.ORML) acc.ormlAssets.push(asset);

        return acc;
      },
      { nativeAsset: undefined, ormlAssets: [] },
    );

    return Promise.all([
      subscribeLockBalanceChange(accountIds, chain, nativeAsset?.assetId),
      subscribeLockOrmlAssetChange(accountIds, chain, ormlAssets),
    ]);
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
    setBalanceIsValid,
  };
};
