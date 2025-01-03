import { type ApiPromise } from '@polkadot/api';
import { type UnsubscribePromise } from '@polkadot/api/types';
import { type Vec } from '@polkadot/types';
import { type AccountData, type Balance as ChainBalance } from '@polkadot/types/interfaces';
import { type PalletBalancesBalanceLock } from '@polkadot/types/lookup';
import { type Codec } from '@polkadot/types/types';
import { BN, BN_ZERO, hexToU8a } from '@polkadot/util';
import { camelCase } from 'lodash';
import noop from 'lodash/noop';
import uniq from 'lodash/uniq';

import {
  type Address,
  type Asset,
  AssetType,
  type Balance,
  type Chain,
  type LockTypes,
  type OrmlExtras,
} from '@/shared/core';
import { getAssetId, getRepeatedIndex, groupBy, isHex, nullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

type NoIdBalance = Omit<Balance, 'id'>;

export const balanceService = {
  subscribeBalances,
  subscribeLockBalances,
  getExistentialDeposit,
};

/**
 * Subscribe to balances with Native/ORML/Statemine calls
 *
 * @param api Instance of ApiPromise
 * @param chain Chain to subscribe
 * @param accountIds All accounts to subscribe
 * @param callback Incoming balances callback
 *
 * @returns {Promise[]}
 */
function subscribeBalances(
  api: ApiPromise,
  chain: Chain,
  accountIds: AccountId[],
  callback: (newBalances: NoIdBalance[]) => void,
): UnsubscribePromise[] {
  const uniqueAccountIds = uniq(accountIds);

  const nativeAsset = chain.assets.find((asset) => asset.type === AssetType.NATIVE);
  const statemineAssets = chain.assets.filter((asset) => asset.type === AssetType.STATEMINE);
  const ormlAssets = chain.assets.filter((asset) => asset.type === AssetType.ORML);

  const stateminePalletGroups = groupBy(statemineAssets, (asset) => {
    if (asset.typeExtras && 'palletName' in asset.typeExtras) {
      return camelCase(asset.typeExtras.palletName);
    }

    return 'assets';
  });

  return [
    subscribeNativeAssetsChange(api, chain, nativeAsset?.assetId, uniqueAccountIds, callback),
    subscribeOrmlAssetsChange(api, chain, ormlAssets, uniqueAccountIds, callback),

    ...Object.entries(stateminePalletGroups).map(([pallet, assets]) => {
      return subscribeStatemineAssetsChange(api, pallet, chain, assets, uniqueAccountIds, callback);
    }),
  ];
}

/**
 * Subscribe to locks balances with Native/Statemine calls
 *
 * @param api Instance of ApiPromise
 * @param chain Chain to subscribe
 * @param accountIds All accounts to subscribe
 * @param callback Incoming balances callback
 *
 * @returns {Promise[]}
 */
function subscribeLockBalances(
  api: ApiPromise,
  chain: Chain,
  accountIds: AccountId[],
  callback: (newLocks: NoIdBalance[]) => void,
): UnsubscribePromise[] {
  const { nativeAsset, ormlAssets } = chain.assets.reduce<{ nativeAsset?: Asset; ormlAssets: Asset[] }>(
    (acc, asset) => {
      if (asset.type === AssetType.NATIVE) acc.nativeAsset = asset;
      if (asset.type === AssetType.ORML) acc.ormlAssets.push(asset);

      return acc;
    },
    { nativeAsset: undefined, ormlAssets: [] },
  );

  return [
    subscribeLockNativeAssetChange(api, chain, nativeAsset?.assetId, accountIds, callback),
    subscribeLockOrmlAssetChange(api, chain, ormlAssets, accountIds, callback),
  ];
}

function subscribeNativeAssetsChange(
  api: ApiPromise,
  chain: Chain,
  assetId: number | undefined,
  accountIds: AccountId[],
  callback: (newBalances: NoIdBalance[]) => void,
): UnsubscribePromise {
  if (assetId === undefined) return Promise.resolve(noop);

  const addresses = accountIds.map((accountId) => toAddress(accountId, { prefix: chain.addressPrefix }));

  return api.query.system.account.multi(addresses, (data) => {
    const newBalances: NoIdBalance[] = [];

    for (const [index, systemAccountInfo] of data.entries()) {
      let frozen: BN;

      // Some chains still use "feeFrozen" or "miscFrozen" (HKO, PARA, XRT, ZTG, SUB)
      const accountData = systemAccountInfo.data as unknown as AccountData;
      if (accountData.miscFrozen || accountData.feeFrozen) {
        const miscFrozen = accountData.miscFrozen.toBn();
        const feeFrozen = accountData.feeFrozen.toBn();
        frozen = miscFrozen.gt(feeFrozen) ? miscFrozen : feeFrozen;
      } else {
        frozen = systemAccountInfo.data.frozen.toBn();
      }

      newBalances.push({
        accountId: accountIds[index],
        chainId: chain.chainId,
        assetId: assetId.toString(),
        verified: true,
        free: systemAccountInfo.data.free.toBn(),
        reserved: systemAccountInfo.data.reserved.toBn(),
        frozen,
      });
    }

    callback(newBalances);
  });
}

function subscribeStatemineAssetsChange(
  api: ApiPromise,
  pallet: string,
  chain: Chain,
  assets: Asset[],
  accountIds: AccountId[],
  callback: (newBalances: NoIdBalance[]) => void,
): UnsubscribePromise {
  if (!api || !assets.length || !accountIds.length) return Promise.resolve(noop);

  if (!api.query[pallet]) {
    throw new Error(`Pallet ${pallet} not found.`);
  }

  const type = api.tx[pallet]?.transfer.meta.args[0].type;
  if (nullable(type)) {
    return Promise.resolve(noop);
  }

  const assetsTuples = assets.reduce<[string | Codec, Address][]>((acc, asset) => {
    const assetId = getAssetId(asset);
    // @ts-expect-error type argument in createType has incorrect types
    const location = isHex(assetId) ? api.createType(type, assetId) : assetId;

    for (const accountId of accountIds) {
      acc.push([location, toAddress(accountId, { prefix: chain.addressPrefix })]);
    }

    return acc;
  }, []);

  return api.query[pallet].account.multi(assetsTuples, (data) => {
    const newBalances: NoIdBalance[] = [];

    for (const [index, accountInfo] of data.entries()) {
      // @ts-expect-error it's hard to type such cases
      const free = accountInfo.isNone ? BN_ZERO : accountInfo.unwrap().balance.toBn();
      const accountIndex = index % accountIds.length;
      const assetIndex = getRepeatedIndex(index, accountIds.length);

      newBalances.push({
        accountId: accountIds[accountIndex],
        chainId: chain.chainId,
        assetId: assets[assetIndex].assetId.toString(),
        verified: true,
        frozen: BN_ZERO,
        reserved: BN_ZERO,
        free,
      });
    }

    callback(newBalances);
  });
}

function getOrmlAssetTuples(
  api: ApiPromise,
  assets: Asset[],
  addressPrefix: number,
  accountIds: AccountId[],
): [Address, Codec][] {
  return assets.reduce<[Address, Codec][]>((acc, asset) => {
    const currencyIdType = (asset?.typeExtras as OrmlExtras).currencyIdType;
    const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
    const assetId = api.createType(currencyIdType, hexToU8a(ormlAssetId));

    for (const accountId of accountIds) {
      acc.push([toAddress(accountId, { prefix: addressPrefix }), assetId]);
    }

    return acc;
  }, []);
}

type OrmlAccountData = {
  free: ChainBalance;
  reserved: ChainBalance;
  frozen: ChainBalance;
};

function subscribeOrmlAssetsChange(
  api: ApiPromise,
  chain: Chain,
  assets: Asset[],
  accountIds: AccountId[],
  callback: (newBalances: NoIdBalance[]) => void,
): UnsubscribePromise {
  if (!api || !assets.length) return Promise.resolve(noop);

  const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies.accounts;

  const assetsTuples = getOrmlAssetTuples(api, assets, chain.addressPrefix, accountIds);

  return method.multi(assetsTuples, (data) => {
    const newBalances: NoIdBalance[] = [];

    for (const [index, accountInfo] of (data as unknown as OrmlAccountData[]).entries()) {
      const accountIndex = index % accountIds.length;
      const assetIndex = getRepeatedIndex(index, accountIds.length);

      newBalances.push({
        accountId: accountIds[accountIndex],
        chainId: chain.chainId,
        assetId: assets[assetIndex].assetId.toString(),
        verified: true,
        free: accountInfo.free.toBn(),
        frozen: accountInfo.frozen.toBn(),
        reserved: accountInfo.reserved.toBn(),
      });
    }

    callback(newBalances);
  });
}

function subscribeLockNativeAssetChange(
  api: ApiPromise,
  chain: Chain,
  assetId: number | undefined,
  accountIds: AccountId[],
  callback: (newLocks: NoIdBalance[]) => void,
): UnsubscribePromise {
  if (!api || assetId === undefined) return Promise.resolve(noop);

  const addresses = accountIds.map((accountId) => toAddress(accountId, { prefix: chain.addressPrefix }));

  return api.query.balances.locks.multi(addresses, (data) => {
    const newLocks: NoIdBalance[] = [];

    for (const [index, balanceLocks] of data.entries()) {
      const locked = balanceLocks.map((lock) => ({
        type: lock.id.toString() as LockTypes,
        amount: lock.amount.toBn(),
      }));

      newLocks.push({
        accountId: accountIds[index],
        chainId: chain.chainId,
        assetId: assetId.toString(),
        locked,
      });
    }

    callback(newLocks);
  });
}

function subscribeLockOrmlAssetChange(
  api: ApiPromise,
  chain: Chain,
  assets: Asset[],
  accountIds: AccountId[],
  callback: (newLocks: NoIdBalance[]) => void,
): UnsubscribePromise {
  if (!api || !assets.length) return Promise.resolve(noop);

  const method = api.query.tokens ? api.query.tokens.locks : api.query.currencies.locks;
  const assetsTuples = getOrmlAssetTuples(api, assets, chain.addressPrefix, accountIds);

  return method.multi(assetsTuples, (data: Vec<PalletBalancesBalanceLock>[]) => {
    const newLocks: NoIdBalance[] = [];

    for (const [index, balanceLocks] of data.entries()) {
      const accountIndex = index % accountIds.length;
      const assetIndex = getRepeatedIndex(index, accountIds.length);

      const locked = balanceLocks.map((lock) => ({
        type: lock.id.toString() as LockTypes,
        amount: lock.amount.toBn(),
      }));

      newLocks.push({
        accountId: accountIds[accountIndex],
        chainId: chain.chainId,
        assetId: assets[assetIndex].assetId.toString(),
        locked,
      });
    }

    callback(newLocks);
  });
}

async function getExistentialDeposit(api: ApiPromise, asset: Asset): Promise<BN> {
  switch (asset.type) {
    case AssetType.NATIVE: {
      return api.consts.balances.existentialDeposit.toBn();
    }
    case AssetType.STATEMINE: {
      return await api.query.assets.asset(asset.assetId).then((balance) => balance.value.minBalance.toBn());
    }
    case AssetType.ORML: {
      return new BN((asset.typeExtras as OrmlExtras).existentialDeposit);
    }
  }
}
