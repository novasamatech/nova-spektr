import { BN, hexToU8a } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { Codec } from '@polkadot/types/types';
import { UnsubscribePromise, VoidFn } from '@polkadot/api/types';
import noop from 'lodash/noop';
import { BalanceLock } from '@polkadot/types/interfaces';

import { getAssetId, getRepeatedIndex, toAddress } from '@shared/lib/utils';
import { AssetType } from '@shared/core';
import type { AccountId, Address, Asset, OrmlExtras, Balance, Chain } from '@shared/core';

export const balanceSubscriptionService = {
  subscribeBalances,
  subscribeLockBalances,
};

function subscribeBalancesChange(
  accountIds: AccountId[],
  chain: Chain,
  api: ApiPromise,
  assetId: number | undefined,
  callback: (newBalances: Balance[]) => void,
): UnsubscribePromise {
  if (assetId === undefined) return Promise.resolve(noop);

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

      return acc;
    }, []);

    callback(newBalances);
  });
}

function subscribeStatemineAssetsChange(
  accountIds: AccountId[],
  chain: Chain,
  api: ApiPromise,
  assets: Asset[],
  callback: (newBalances: Balance[]) => void,
): UnsubscribePromise {
  if (!api || !assets.length || !accountIds.length || !api.query.assets) return Promise.resolve(noop);

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

      return acc;
    }, []);

    callback(newBalances);
  });
}

function getOrmlAssetTuples(
  api: ApiPromise,
  accountIds: AccountId[],
  assets: Asset[],
  addressPrefix: number,
): [Address, Codec][] {
  return assets.reduce<[Address, Codec][]>((acc, asset) => {
    const currencyIdType = (asset?.typeExtras as OrmlExtras).currencyIdType;
    const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
    const assetId = api.createType(currencyIdType, hexToU8a(ormlAssetId));

    accountIds.forEach((accountId) => {
      acc.push([toAddress(accountId, { prefix: addressPrefix }), assetId]);
    });

    return acc;
  }, []);
}

function subscribeOrmlAssetsChange(
  accountIds: AccountId[],
  chain: Chain,
  api: ApiPromise,
  assets: Asset[],
  callback: (newBalances: Balance[]) => void,
): UnsubscribePromise {
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

      return acc;
    }, []);

    callback(newBalances);
  });
}

function subscribeBalances(
  chain: Chain,
  api: ApiPromise,
  accountIds: AccountId[],
  callback: (newBalances: Balance[]) => void,
): Promise<VoidFn[]> {
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
    subscribeBalancesChange(accountIds, chain, api, nativeAsset?.assetId ?? undefined, callback),
    subscribeStatemineAssetsChange(accountIds, chain, api, statemineAssets, callback),
    subscribeOrmlAssetsChange(accountIds, chain, api, ormlAssets, callback),
  ]);
}

function subscribeLockBalanceChange(
  chain: Chain,
  api: ApiPromise,
  accountIds: AccountId[],
  assetId: number | undefined,
  callback: (newLocks: Balance[]) => void,
): UnsubscribePromise {
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

    callback(newLocks);
  });
}

function subscribeLockOrmlAssetChange(
  chain: Chain,
  api: ApiPromise,
  accountIds: AccountId[],
  assets: Asset[],
  callback: (newLocks: Balance[]) => void,
): UnsubscribePromise {
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

    callback(newLocks);
  });
}

function subscribeLockBalances(
  chain: Chain,
  api: ApiPromise,
  accountIds: AccountId[],
  callback: (newLocks: Balance[]) => void,
): Promise<VoidFn[]> {
  const { nativeAsset, ormlAssets } = chain.assets.reduce<{ nativeAsset?: Asset; ormlAssets: Asset[] }>(
    (acc, asset) => {
      if (!asset.type) acc.nativeAsset = asset;
      if (asset.type === AssetType.ORML) acc.ormlAssets.push(asset);

      return acc;
    },
    { nativeAsset: undefined, ormlAssets: [] },
  );

  return Promise.all([
    subscribeLockBalanceChange(chain, api, accountIds, nativeAsset?.assetId, callback),
    subscribeLockOrmlAssetChange(chain, api, accountIds, ormlAssets, callback),
  ]);
}
