import { type ApiPromise } from '@polkadot/api';
import { type UnsubscribePromise } from '@polkadot/api/types';
import { type Option, type Vec } from '@polkadot/types';
import { type AccountData, type Balance as ChainBalance } from '@polkadot/types/interfaces';
import { type PalletAssetsAssetDetails, type PalletBalancesBalanceLock } from '@polkadot/types/lookup';
import { type Codec } from '@polkadot/types/types';
import { BN, BN_ZERO, hexToU8a } from '@polkadot/util';
import { BigNumber } from 'bignumber.js';
import { camelCase, noop, uniq } from 'lodash';

import {
  type Asset,
  type BalanceDraft,
  type BalanceMap,
  type Chain,
  type ChainId,
  type LockTypes,
  type OrmlExtras,
  AssetType,
} from '@/shared/core';
import {
  getAssetId,
  getRepeatedIndex,
  getRoundedValue,
  groupBy,
  nonNullable,
  nullable,
  totalAmount,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, accountService } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { type CurrencyItem, type PriceObject } from '../../price-provider/lib/types';

export const balanceService = {
  subscribeBalances,
  subscribeLockBalances,
  getExistentialDeposit,

  fetchBalances,
  fetchLockBalances,
  calculateWalletBalance,
};

// constants
const holdAndFreezesFlag = new BN('80000000000000000000000000000000', 16);

// subscription

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
  callback: (newBalances: BalanceDraft[]) => void,
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

  const subscriptions: UnsubscribePromise[] = [];

  if (nonNullable(nativeAsset)) {
    subscriptions.push(subscribeNativeAssetsChange(api, chain, nativeAsset, uniqueAccountIds, callback));
  }

  if (ormlAssets.length > 0) {
    subscriptions.push(subscribeOrmlAssetsChange(api, chain, ormlAssets, uniqueAccountIds, callback));
  }

  const statemineGroups = Object.entries(stateminePalletGroups);

  if (statemineGroups.length > 0) {
    subscriptions.push(
      ...statemineGroups.map(([pallet, assets = []]) => {
        return subscribeStatemineAssetsChange(api, pallet, chain, assets, uniqueAccountIds, callback);
      }),
    );
  }

  return subscriptions;
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
  callback: (newLocks: BalanceDraft[]) => void,
): UnsubscribePromise[] {
  const { nativeAsset, ormlAssets } = chain.assets.reduce<{ nativeAsset?: Asset; ormlAssets: Asset[] }>(
    (acc, asset) => {
      if (asset.type === AssetType.NATIVE) acc.nativeAsset = asset;
      if (asset.type === AssetType.ORML) acc.ormlAssets.push(asset);

      return acc;
    },
    { nativeAsset: undefined, ormlAssets: [] },
  );

  const subscriptions: UnsubscribePromise[] = [];

  if (nonNullable(nativeAsset)) {
    subscriptions.push(subscribeLockNativeAssetChange(api, chain, nativeAsset, accountIds, callback));
  }

  if (ormlAssets.length > 0) {
    subscriptions.push(subscribeLockOrmlAssetChange(api, chain, ormlAssets, accountIds, callback));
  }

  return subscriptions;
}

async function subscribeNativeAssetsChange(
  api: ApiPromise,
  chain: Chain,
  asset: Asset,
  accountIds: AccountId[],
  callback: (newBalances: BalanceDraft[]) => void,
): UnsubscribePromise {
  const ed = await getExistentialDeposit(api, asset);

  return api.query.system.account.multi(accountIds, (data) => {
    const newBalances: BalanceDraft[] = [];

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
        accountId: accountIds[index]!,
        chainId: chain.chainId,
        assetId: asset.assetId,
        assetType: asset.type,
        free: systemAccountInfo.data.free.toBn(),
        reserved: systemAccountInfo.data.reserved.toBn(),
        frozen,
        ed,
        providers: systemAccountInfo.providers.toNumber(),
        consumers: systemAccountInfo.consumers.toNumber(),
        sufficients: systemAccountInfo.sufficients.toNumber(),
        transferableMode: hasHoldAndFreezesFlag(systemAccountInfo.data.flags) ? 'holdAndFreezes' : 'legacy',
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
  callback: (newBalances: BalanceDraft[]) => void,
): UnsubscribePromise {
  if (!api || !assets.length || !accountIds.length) return Promise.resolve(noop);

  if (!api.query[pallet]) {
    throw new Error(`Pallet ${pallet} not found.`);
  }

  const type = api.tx[pallet]?.transfer?.meta.args[0]?.type;
  if (nullable(type)) {
    return Promise.resolve(noop);
  }

  const assetsTuples = assets.reduce<[string | Codec, AccountId][]>((acc, asset) => {
    const assetId = getAssetId(asset);
    // @ts-expect-error type argument in createType has incorrect types
    const location = api.createType(type, assetId);

    for (const accountId of accountIds) {
      acc.push([location, accountId]);
    }

    return acc;
  }, []);

  // pallet existence is checked above
  return api.query[pallet]!.account!.multi(assetsTuples, async (data) => {
    const newBalances: BalanceDraft[] = [];

    for (const [index, accountInfo] of data.entries()) {
      // @ts-expect-error it's hard to type such cases
      const free = accountInfo.isNone ? BN_ZERO : accountInfo.unwrap().balance.toBn();
      const accountIndex = index % accountIds.length;
      const assetIndex = getRepeatedIndex(index, accountIds.length);

      const accountId = accountIds.at(accountIndex);
      const asset = assets.at(assetIndex);

      if (nullable(accountId)) continue;
      if (nullable(asset)) continue;

      const ed = await getExistentialDeposit(api, asset);

      newBalances.push({
        accountId,
        chainId: chain.chainId,
        assetId: asset.assetId,
        assetType: asset.type,
        frozen: BN_ZERO,
        reserved: BN_ZERO,
        free,
        ed,
        providers: 0,
        consumers: 0,
        sufficients: 0,
        transferableMode: 'legacy',
      });
    }

    callback(newBalances);
  });
}

function getOrmlAssetTuples(api: ApiPromise, assets: Asset[], accountIds: AccountId[]): [AccountId, Codec][] {
  return assets.reduce<[AccountId, Codec][]>((acc, asset) => {
    const currencyIdType = (asset?.typeExtras as OrmlExtras).currencyIdType;
    const ormlAssetId = (asset?.typeExtras as OrmlExtras).currencyIdScale;
    const assetId = api.createType(currencyIdType, hexToU8a(ormlAssetId));

    for (const accountId of accountIds) {
      acc.push([accountId, assetId]);
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
  callback: (newBalances: BalanceDraft[]) => void,
): UnsubscribePromise {
  if (!api || !assets.length) return Promise.resolve(noop);

  const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies?.accounts;
  if (nullable(method)) return Promise.resolve(noop);

  const assetsTuples = getOrmlAssetTuples(api, assets, accountIds);

  return method.multi(assetsTuples, async (data) => {
    const newBalances: BalanceDraft[] = [];

    for (const [index, accountInfo] of (data as unknown as OrmlAccountData[]).entries()) {
      const accountIndex = index % accountIds.length;
      const assetIndex = getRepeatedIndex(index, accountIds.length);

      const accountId = accountIds.at(accountIndex);
      const asset = assets.at(assetIndex);

      if (nullable(accountId)) continue;
      if (nullable(asset)) continue;

      const ed = await getExistentialDeposit(api, asset);

      newBalances.push({
        accountId,
        chainId: chain.chainId,
        assetId: asset.assetId,
        assetType: asset.type,
        free: accountInfo.free.toBn(),
        frozen: accountInfo.frozen.toBn(),
        reserved: accountInfo.reserved.toBn(),
        providers: 0,
        consumers: 0,
        sufficients: 0,
        transferableMode: 'legacy',
        ed,
      });
    }

    callback(newBalances);
  });
}

function subscribeLockNativeAssetChange(
  api: ApiPromise,
  chain: Chain,
  asset: Asset,
  accountIds: AccountId[],
  callback: (newLocks: BalanceDraft[]) => void,
): UnsubscribePromise {
  return api.query.balances.locks.multi(accountIds, (data) => {
    const newLocks: BalanceDraft[] = [];

    for (const [index, balanceLocks] of data.entries()) {
      const locked = balanceLocks.map((lock) => ({
        type: lock.id.toString() as LockTypes,
        amount: lock.amount.toBn(),
      }));

      newLocks.push({
        accountId: accountIds[index]!,
        chainId: chain.chainId,
        assetId: asset.assetId,
        assetType: asset.type,
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
  callback: (newLocks: BalanceDraft[]) => void,
): UnsubscribePromise {
  if (!api || !assets.length) return Promise.resolve(noop);

  const method = api.query.tokens ? api.query.tokens.locks : api.query.currencies?.locks;
  if (nullable(method)) return Promise.resolve(noop);

  const assetsTuples = getOrmlAssetTuples(api, assets, accountIds);

  return method.multi(assetsTuples, (data: Vec<PalletBalancesBalanceLock>[]) => {
    const newLocks: BalanceDraft[] = [];

    for (const [index, balanceLocks] of data.entries()) {
      const accountIndex = index % accountIds.length;
      const assetIndex = getRepeatedIndex(index, accountIds.length);

      const locked = balanceLocks.map((lock) => ({
        type: lock.id.toString() as LockTypes,
        amount: lock.amount.toBn(),
      }));

      newLocks.push({
        accountId: accountIds[accountIndex]!,
        chainId: chain.chainId,
        assetId: assets[assetIndex]!.assetId,
        assetType: assets[assetIndex]!.type,
        locked,
      });
    }

    callback(newLocks);
  });
}

// fetching

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
async function fetchBalances(api: ApiPromise, chain: Chain, accountIds: AccountId[]): Promise<BalanceDraft[]> {
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

  const balances = await Promise.all([
    nativeAsset ? fetchNativeAssets(api, chain, nativeAsset, uniqueAccountIds) : [],
    fetchOrmlAssets(api, chain, ormlAssets, uniqueAccountIds),
    ...Object.entries(stateminePalletGroups).map(([pallet, assets = []]) => {
      return fetchStatemineAssets(api, pallet, chain, assets, uniqueAccountIds);
    }),
  ]);

  return balances.flat();
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
async function fetchLockBalances(api: ApiPromise, chain: Chain, accountIds: AccountId[]): Promise<BalanceDraft[]> {
  const { nativeAsset, ormlAssets } = chain.assets.reduce<{ nativeAsset?: Asset; ormlAssets: Asset[] }>(
    (acc, asset) => {
      if (asset.type === AssetType.NATIVE) acc.nativeAsset = asset;
      if (asset.type === AssetType.ORML) acc.ormlAssets.push(asset);

      return acc;
    },
    { nativeAsset: undefined, ormlAssets: [] },
  );

  const [native, orml] = await Promise.all([
    nativeAsset ? fetchLockNativeAsset(api, chain, nativeAsset, accountIds) : [],
    fetchLockOrmlAsset(api, chain, ormlAssets, accountIds),
  ]);

  return [...native, ...orml];
}

async function fetchNativeAssets(
  api: ApiPromise,
  chain: Chain,
  asset: Asset,
  accountIds: AccountId[],
): Promise<BalanceDraft[]> {
  const data = await api.query.system.account.multi(accountIds);
  const ed = await getExistentialDeposit(api, asset);
  const result: BalanceDraft[] = [];

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

    const accountId = accountIds.at(index);

    if (nullable(accountId)) continue;

    result.push({
      accountId,
      chainId: chain.chainId,
      assetId: asset.assetId,
      assetType: asset.type,
      free: systemAccountInfo.data.free.toBn(),
      reserved: systemAccountInfo.data.reserved.toBn(),
      frozen,
      ed,
      providers: systemAccountInfo.providers.toNumber(),
      consumers: systemAccountInfo.consumers.toNumber(),
      sufficients: systemAccountInfo.sufficients.toNumber(),
      transferableMode: hasHoldAndFreezesFlag(systemAccountInfo.data.flags) ? 'holdAndFreezes' : 'legacy',
    });
  }

  return result;
}

async function fetchStatemineAssets(
  api: ApiPromise,
  pallet: string,
  chain: Chain,
  assets: Asset[],
  accountIds: AccountId[],
): Promise<BalanceDraft[]> {
  if (!assets.length || !accountIds.length) return [];

  if (!api.query[pallet]) {
    throw new Error(`Pallet ${pallet} not found.`);
  }

  const type = api.tx[pallet]?.transfer?.meta.args[0]?.type;
  if (nullable(type)) {
    return [];
  }

  const assetsTuples = assets.reduce<[string | Codec, AccountId][]>((acc, asset) => {
    const assetId = getAssetId(asset);
    // @ts-expect-error type argument in createType has incorrect types
    const location = api.createType(type, assetId);

    for (const accountId of accountIds) {
      acc.push([location, accountId]);
    }

    return acc;
  }, []);

  // pallet existence is checked above
  const data = await api.query[pallet]?.account?.multi(assetsTuples);
  const result: BalanceDraft[] = [];

  for (const [index, accountInfo] of data?.entries() ?? []) {
    // @ts-expect-error it's hard to type such cases
    const free = accountInfo.isNone ? BN_ZERO : accountInfo.unwrap().balance.toBn();

    const accountIndex = index % accountIds.length;
    const assetIndex = getRepeatedIndex(index, accountIds.length);
    const accountId = accountIds.at(accountIndex);
    const asset = assets.at(assetIndex);

    if (nullable(accountId)) continue;
    if (nullable(asset)) continue;

    const ed = await getExistentialDeposit(api, asset);

    result.push({
      accountId,
      chainId: chain.chainId,
      assetId: asset.assetId,
      assetType: asset.type,
      frozen: BN_ZERO,
      reserved: BN_ZERO,
      free,
      ed,
      providers: 0,
      consumers: 0,
      sufficients: 0,
      transferableMode: 'legacy',
    });
  }

  return result;
}

async function fetchOrmlAssets(
  api: ApiPromise,
  chain: Chain,
  assets: Asset[],
  accountIds: AccountId[],
): Promise<BalanceDraft[]> {
  if (!api || !assets.length) return [];

  const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies?.accounts;
  if (nullable(method)) return [];

  const assetsTuples = getOrmlAssetTuples(api, assets, accountIds);

  const data = await method.multi(assetsTuples);
  const result: BalanceDraft[] = [];

  for (const [index, accountInfo] of (data as unknown as OrmlAccountData[]).entries()) {
    const accountIndex = index % accountIds.length;
    const assetIndex = getRepeatedIndex(index, accountIds.length);
    const accountId = accountIds.at(accountIndex);
    const asset = assets.at(assetIndex);

    if (nullable(accountId)) continue;
    if (nullable(asset)) continue;

    const ed = await getExistentialDeposit(api, asset);

    result.push({
      accountId,
      chainId: chain.chainId,
      assetId: asset.assetId,
      assetType: asset.type,
      free: accountInfo.free.toBn(),
      frozen: accountInfo.frozen.toBn(),
      reserved: accountInfo.reserved.toBn(),
      ed,
      providers: 0,
      consumers: 0,
      sufficients: 0,
      transferableMode: 'legacy',
    });
  }

  return result;
}

async function fetchLockNativeAsset(
  api: ApiPromise,
  chain: Chain,
  asset: Asset,
  accountIds: AccountId[],
): Promise<BalanceDraft[]> {
  const data = await api.query.balances.locks.multi(accountIds);
  const result: BalanceDraft[] = [];

  for (const [index, balanceLocks] of data.entries()) {
    const locked = balanceLocks.map((lock) => ({
      type: lock.id.toString() as LockTypes,
      amount: lock.amount.toBn(),
    }));

    result.push({
      accountId: accountIds[index]!,
      chainId: chain.chainId,
      assetId: asset.assetId,
      assetType: asset.type,
      locked,
    });
  }

  return result;
}

async function fetchLockOrmlAsset(
  api: ApiPromise,
  chain: Chain,
  assets: Asset[],
  accountIds: AccountId[],
): Promise<BalanceDraft[]> {
  if (!assets.length) return [];

  const method = api.query.tokens ? api.query.tokens.locks : api.query.currencies?.locks;
  if (nullable(method)) return [];

  const assetsTuples = getOrmlAssetTuples(api, assets, accountIds);
  const data: Vec<PalletBalancesBalanceLock>[] = await method.multi(assetsTuples);

  const result: BalanceDraft[] = [];

  for (const [index, balanceLocks] of data.entries()) {
    const accountIndex = index % accountIds.length;
    const assetIndex = getRepeatedIndex(index, accountIds.length);

    const locked = balanceLocks.map((lock) => ({
      type: lock.id.toString() as LockTypes,
      amount: lock.amount.toBn(),
    }));

    result.push({
      accountId: accountIds[accountIndex]!,
      chainId: chain.chainId,
      assetId: assets[assetIndex]!.assetId,
      assetType: assets[assetIndex]!.type,
      locked,
    });
  }

  return result;
}

async function getExistentialDeposit(api: ApiPromise, asset: Asset): Promise<BN> {
  switch (asset.type) {
    case AssetType.NATIVE: {
      return api.consts.balances.existentialDeposit.toBn();
    }
    case AssetType.STATEMINE: {
      let pallet;
      if (asset.typeExtras && 'palletName' in asset.typeExtras) {
        pallet = camelCase(asset.typeExtras.palletName);
      } else {
        pallet = 'assets';
      }

      const assetId = getAssetId(asset);

      return await api.query[pallet]!.asset!(assetId).then((balance) => {
        if ((balance as Option<PalletAssetsAssetDetails>).isNone) {
          return BN_ZERO;
        }
        return (balance as Option<PalletAssetsAssetDetails>).value.minBalance.toBn();
      });
    }
    case AssetType.ORML: {
      return new BN((asset.typeExtras as OrmlExtras).existentialDeposit);
    }
  }
}

function hasHoldAndFreezesFlag(flags: BN) {
  return flags.and(holdAndFreezesFlag).eq(holdAndFreezesFlag);
}

/**
 * Calculates the total fiat balance for a wallet across all chains and assets.
 *
 * @remarks
 *   - Skips balances for accounts/chains that don't exist in the provided data
 *   - Requires valid price data for each asset to include it in calculations
 *   - Uses asset precision for accurate fiat conversion calculations
 *
 * @returns The total wallet balance in the specified fiat currency as
 *   BigNumber. Returns 0 if any required data is missing or invalid.
 */
function calculateWalletBalance({
  accounts,
  chains,
  balances,
  currency,
  prices,
}: {
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  balances: BalanceMap;
  currency: CurrencyItem | null;
  prices: PriceObject | null;
}) {
  if (nullable(currency?.coingeckoId) || nullable(prices)) {
    return new BigNumber(0);
  }

  const allChains = Object.values(chains);
  let total = new BigNumber(0);

  for (const account of accounts) {
    let accountChains;
    if (accountService.isChainAccount(account)) {
      const chain = chains[account.chainId];
      accountChains = nonNullable(chain) ? [chain] : [];
    } else {
      accountChains = allChains.filter((c) => accountService.isAccountAvailableOnChain(account, c));
    }

    for (const chain of accountChains) {
      for (const asset of chain.assets) {
        if (nullable(asset.priceId)) continue;

        const pricesMap = prices[asset.priceId];
        if (nullable(pricesMap)) continue;

        const price = pricesMap[currency.coingeckoId];
        if (nullable(price)) continue;

        const balance = balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId);
        const fiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);

        total = total.plus(new BigNumber(fiatBalance));
      }
    }
  }

  return total;
}
