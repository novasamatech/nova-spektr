import { useLiveQuery } from 'dexie-react-hooks';
import { BalanceLock } from '@polkadot/types/interfaces';
import { BN, hexToU8a } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { Codec } from '@polkadot/types/types';
import { UnsubscribePromise } from '@polkadot/api/types';
import noop from 'lodash/noop';

import { ExtendedChain } from '@renderer/entities/network/lib/common/types';
import { validate } from '../../../services/dataVerification/dataVerification';
import { BalanceDS, storage } from '../../../shared/api/storage';
import { IBalanceService } from './common/types';
import { VERIFY_TIMEOUT } from './common/constants';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { getAssetId, toAddress } from '@renderer/shared/lib/utils';
import type { AccountId, Address, Asset, ChainId, OrmlExtras } from '@renderer/shared/core';
import { AssetType } from '@renderer/shared/core';

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
    accountIds: AccountId[],
    chain: ExtendedChain,
    assetId: number,
    relaychain?: ExtendedChain,
  ): UnsubscribePromise => {
    const api = chain.api;
    if (!api) return Promise.resolve(noop);

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

      insertBalances(newBalances);
    });
  };

  const subscribeStatemineAssetsChange = (
    accountIds: AccountId[],
    chain: ExtendedChain,
    assets: Asset[],
    relaychain?: ExtendedChain,
  ): UnsubscribePromise => {
    const api = chain.api;
    if (!api) return Promise.resolve(noop);

    const assetsMap = assets.reduce<[string, Address][]>((acc, asset) => {
      accountIds.forEach((accountId) => {
        acc.push([getAssetId(asset), toAddress(accountId, { prefix: chain.addressPrefix })]);
      });

      return acc;
    }, []);

    return api.query.assets.account.multi(assetsMap, (data: any[]) => {
      const newBalances = data.reduce((acc, accountInfo, index) => {
        const free = accountInfo.isNone ? '0' : accountInfo.unwrap().balance.toString();
        acc.push({
          accountId: accountIds[index],
          chainId: chain.chainId,
          assetId: assetsMap[index][0].toString(),
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

      insertBalances(newBalances);
    });
  };

  const subscribeOrmlAssetsChange = (
    accountIds: AccountId[],
    chain: ExtendedChain,
    assets: Asset[],
    relaychain?: ExtendedChain,
  ): UnsubscribePromise => {
    const api = chain.api;
    if (!api) return Promise.resolve(noop);

    const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies.accounts;

    const assetsMap = assets.reduce<[Codec, Address][]>((acc, asset) => {
      const currencyIdType = (asset?.typeExtras as OrmlExtras).currencyIdType;
      const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
      const assetId = api.createType(currencyIdType, hexToU8a(ormlAssetId));

      accountIds.forEach((accountId) => {
        acc.push([assetId, toAddress(accountId, { prefix: chain.addressPrefix })]);
      });

      return acc;
    }, []);

    return method.multi(assetsMap, (data: any[]) => {
      const newBalances = data.reduce((acc, accountInfo, index) => {
        acc.push({
          accountId: accountIds[index],
          chainId: chain.chainId,
          assetId: assetsMap[index][0].toString(),
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

      insertBalances(newBalances);
    });
  };

  const subscribeLockBalanceChange = (
    accountIds: AccountId[],
    chain: ExtendedChain,
    assetId: number,
  ): UnsubscribePromise => {
    const api = chain.api;
    if (!api) return Promise.resolve(noop);

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

      insertBalances(newLocks);
    });
  };

  const subscribeLockOrmlAssetChange = (
    accountIds: AccountId[],
    chain: ExtendedChain,
    assets: Asset[],
  ): UnsubscribePromise => {
    const api = chain.api;
    if (!api) return Promise.resolve(noop);

    const method = api.query.tokens ? api.query.tokens.locks : api.query.currencies.locks;

    const assetsMap = assets.reduce<[Codec, Address][]>((acc, asset) => {
      const currencyIdType = (asset?.typeExtras as OrmlExtras).currencyIdType;
      const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
      const assetId = api.createType(currencyIdType, hexToU8a(ormlAssetId));

      accountIds.forEach((accountId) => {
        acc.push([assetId, toAddress(accountId, { prefix: chain.addressPrefix })]);
      });

      return acc;
    }, []);

    return method.multi(assetsMap, (data: any[]) => {
      const newLocks = data.reduce((acc, balanceLock, index) => {
        const locked = balanceLock.map((lock: BalanceLock) => ({
          type: lock.id.toString(),
          amount: lock.amount.toString(),
        }));

        acc.push({
          accountId: accountIds[index],
          chainId: chain.chainId,
          assetId: assetsMap[index][0].toString(),
          locked,
        });

        return acc;
      }, []);

      insertBalances(newLocks);
    });
  };

  const subscribeBalances = (
    chain: ExtendedChain,
    accountIds: AccountId[],
    relaychain?: ExtendedChain,
  ): Promise<any> => {
    const { native, statemine, orml } = chain.assets.reduce<Record<'native' | 'statemine' | 'orml', Asset[]>>(
      (acc, asset) => {
        if (!asset.type) acc.native.push(asset);
        if (asset.type === AssetType.STATEMINE) acc.native.push(asset);
        if (asset.type === AssetType.ORML) acc.native.push(asset);

        return acc;
      },
      { native: [], statemine: [], orml: [] },
    );

    return Promise.all([
      ...native.map((asset) => subscribeBalancesChange(accountIds, chain, asset.assetId, relaychain)),
      subscribeStatemineAssetsChange(accountIds, chain, statemine, relaychain),
      subscribeOrmlAssetsChange(accountIds, chain, orml, relaychain),
      () => validationSubscriptionService.unsubscribe(chain.chainId),
    ]);
  };

  const subscribeLockBalances = (chain: ExtendedChain, accountIds: AccountId[]): Promise<any> => {
    const { native, orml } = chain.assets.reduce<Record<'native' | 'orml', Asset[]>>(
      (acc, asset) => {
        if (!asset.type) acc.native.push(asset);
        if (asset.type === AssetType.ORML) acc.native.push(asset);

        return acc;
      },
      { native: [], orml: [] },
    );

    return Promise.all([
      ...native.map((asset) => subscribeLockBalanceChange(accountIds, chain, asset.assetId)),
      subscribeLockOrmlAssetChange(accountIds, chain, orml),
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
