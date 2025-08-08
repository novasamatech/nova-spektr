import { type ApiPromise } from '@polkadot/api';
import { type UnsubscribePromise } from '@polkadot/api/types';
import { type Vec } from '@polkadot/types';
import { type AccountData, type Balance as ChainBalance } from '@polkadot/types/interfaces';
import { type PalletBalancesBalanceLock } from '@polkadot/types/lookup';
import { type Codec } from '@polkadot/types/types';
import { BN, BN_ZERO, hexToU8a } from '@polkadot/util';
import { BigNumber } from 'bignumber.js';
import { camelCase, noop, uniq } from 'lodash';

import {
  type Asset,
  AssetType,
  type Balance,
  type Chain,
  type ChainId,
  type LockTypes,
  type OrmlExtras,
  type Wallet,
} from '@/shared/core';
import {
  dictionary,
  getAssetId,
  getRepeatedIndex,
  getRoundedValue,
  groupBy,
  nullable,
  totalAmount,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { type CurrencyItem, type PriceObject } from '../../price-provider/lib/types';

type NoIdBalance = Omit<Balance, 'id'>;

export const balanceService = {
  subscribeBalances,
  subscribeLockBalances,
  getExistentialDeposit,

  fetchBalances,
  fetchLockBalances,
  calculateWalletBalance,
};

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

    ...Object.entries(stateminePalletGroups).map(([pallet, assets = []]) => {
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

  return api.query.system.account.multi(accountIds, (data) => {
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
        assetId: assetId,
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

  const assetsTuples = assets.reduce<[string | Codec, AccountId][]>((acc, asset) => {
    const assetId = getAssetId(asset);
    // @ts-expect-error type argument in createType has incorrect types
    const location = api.createType(type, assetId);

    for (const accountId of accountIds) {
      acc.push([location, accountId]);
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
        assetId: assets[assetIndex].assetId,
        verified: true,
        frozen: BN_ZERO,
        reserved: BN_ZERO,
        free,
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
  callback: (newBalances: NoIdBalance[]) => void,
): UnsubscribePromise {
  if (!api || !assets.length) return Promise.resolve(noop);

  const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies.accounts;

  const assetsTuples = getOrmlAssetTuples(api, assets, accountIds);

  return method.multi(assetsTuples, (data) => {
    const newBalances: NoIdBalance[] = [];

    for (const [index, accountInfo] of (data as unknown as OrmlAccountData[]).entries()) {
      const accountIndex = index % accountIds.length;
      const assetIndex = getRepeatedIndex(index, accountIds.length);

      newBalances.push({
        accountId: accountIds[accountIndex],
        chainId: chain.chainId,
        assetId: assets[assetIndex].assetId,
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

  return api.query.balances.locks.multi(accountIds, (data) => {
    const newLocks: NoIdBalance[] = [];

    for (const [index, balanceLocks] of data.entries()) {
      const locked = balanceLocks.map((lock) => ({
        type: lock.id.toString() as LockTypes,
        amount: lock.amount.toBn(),
      }));

      newLocks.push({
        accountId: accountIds[index],
        chainId: chain.chainId,
        assetId,
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
  const assetsTuples = getOrmlAssetTuples(api, assets, accountIds);

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
        assetId: assets[assetIndex].assetId,
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
async function fetchBalances(api: ApiPromise, chain: Chain, accountIds: AccountId[]): Promise<NoIdBalance[]> {
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
    nativeAsset ? fetchNativeAssets(api, chain, nativeAsset.assetId, uniqueAccountIds) : [],
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
async function fetchLockBalances(api: ApiPromise, chain: Chain, accountIds: AccountId[]): Promise<NoIdBalance[]> {
  const { nativeAsset, ormlAssets } = chain.assets.reduce<{ nativeAsset?: Asset; ormlAssets: Asset[] }>(
    (acc, asset) => {
      if (asset.type === AssetType.NATIVE) acc.nativeAsset = asset;
      if (asset.type === AssetType.ORML) acc.ormlAssets.push(asset);

      return acc;
    },
    { nativeAsset: undefined, ormlAssets: [] },
  );

  const [native, orml] = await Promise.all([
    nativeAsset ? fetchLockNativeAsset(api, chain, nativeAsset?.assetId, accountIds) : [],
    fetchLockOrmlAsset(api, chain, ormlAssets, accountIds),
  ]);

  return [...native, ...orml];
}

async function fetchNativeAssets(
  api: ApiPromise,
  chain: Chain,
  assetId: number,
  accountIds: AccountId[],
): Promise<NoIdBalance[]> {
  const data = await api.query.system.account.multi(accountIds);
  const result: NoIdBalance[] = [];

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

    result.push({
      accountId: accountIds[index],
      chainId: chain.chainId,
      assetId: assetId,
      verified: true,
      free: systemAccountInfo.data.free.toBn(),
      reserved: systemAccountInfo.data.reserved.toBn(),
      frozen,
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
): Promise<NoIdBalance[]> {
  if (!assets.length || !accountIds.length) return [];

  if (!api.query[pallet]) {
    throw new Error(`Pallet ${pallet} not found.`);
  }

  const type = api.tx[pallet]?.transfer.meta.args[0].type;
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

  const data = await api.query[pallet].account.multi(assetsTuples);
  const result: NoIdBalance[] = [];

  for (const [index, accountInfo] of data.entries()) {
    // @ts-expect-error it's hard to type such cases
    const free = accountInfo.isNone ? BN_ZERO : accountInfo.unwrap().balance.toBn();
    const accountIndex = index % accountIds.length;
    const assetIndex = getRepeatedIndex(index, accountIds.length);

    result.push({
      accountId: accountIds[accountIndex],
      chainId: chain.chainId,
      assetId: assets[assetIndex].assetId,
      verified: true,
      frozen: BN_ZERO,
      reserved: BN_ZERO,
      free,
    });
  }

  return result;
}

async function fetchOrmlAssets(
  api: ApiPromise,
  chain: Chain,
  assets: Asset[],
  accountIds: AccountId[],
): Promise<NoIdBalance[]> {
  if (!api || !assets.length) return [];

  const method = api.query.tokens ? api.query.tokens.accounts : api.query.currencies.accounts;

  const assetsTuples = getOrmlAssetTuples(api, assets, accountIds);

  const data = await method.multi(assetsTuples);
  const result: NoIdBalance[] = [];

  for (const [index, accountInfo] of (data as unknown as OrmlAccountData[]).entries()) {
    const accountIndex = index % accountIds.length;
    const assetIndex = getRepeatedIndex(index, accountIds.length);

    result.push({
      accountId: accountIds[accountIndex],
      chainId: chain.chainId,
      assetId: assets[assetIndex].assetId,
      verified: true,
      free: accountInfo.free.toBn(),
      frozen: accountInfo.frozen.toBn(),
      reserved: accountInfo.reserved.toBn(),
    });
  }

  return result;
}

async function fetchLockNativeAsset(
  api: ApiPromise,
  chain: Chain,
  assetId: number,
  accountIds: AccountId[],
): Promise<NoIdBalance[]> {
  const data = await api.query.balances.locks.multi(accountIds);
  const result: NoIdBalance[] = [];

  for (const [index, balanceLocks] of data.entries()) {
    const locked = balanceLocks.map((lock) => ({
      type: lock.id.toString() as LockTypes,
      amount: lock.amount.toBn(),
    }));

    result.push({
      accountId: accountIds[index],
      chainId: chain.chainId,
      assetId,
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
): Promise<NoIdBalance[]> {
  if (!assets.length) return [];

  const method = api.query.tokens ? api.query.tokens.locks : api.query.currencies.locks;
  const assetsTuples = getOrmlAssetTuples(api, assets, accountIds);
  const data: Vec<PalletBalancesBalanceLock>[] = await method.multi(assetsTuples);

  const result: NoIdBalance[] = [];

  for (const [index, balanceLocks] of data.entries()) {
    const accountIndex = index % accountIds.length;
    const assetIndex = getRepeatedIndex(index, accountIds.length);

    const locked = balanceLocks.map((lock) => ({
      type: lock.id.toString() as LockTypes,
      amount: lock.amount.toBn(),
    }));

    result.push({
      accountId: accountIds[accountIndex],
      chainId: chain.chainId,
      assetId: assets[assetIndex].assetId,
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
      return await api.query.assets.asset(asset.assetId).then((balance) => balance.value.minBalance.toBn());
    }
    case AssetType.ORML: {
      return new BN((asset.typeExtras as OrmlExtras).existentialDeposit);
    }
  }
}

/**
 * Calculates the total fiat balance for a wallet across all chains and assets.
 *
 * @remarks
 *   - Excludes vault base accounts for Polkadot Vault wallets
 *   - Skips balances for accounts/chains that don't exist in the provided data
 *   - Requires valid price data for each asset to include it in calculations
 *   - Uses asset precision for accurate fiat conversion calculations
 *
 * @param params - The calculation parameters
 * @param params.wallet - The wallet to calculate balance for
 * @param params.chains - Record of chain configurations indexed by chain ID
 * @param params.balances - Array of balance entries for the wallet
 * @param params.currency - The target fiat currency for calculation
 * @param params.prices - Price data mapping asset price IDs to currency prices
 *
 * @returns The total wallet balance in the specified fiat currency as
 *   BigNumber. Returns 0 if any required data is missing or invalid.
 */
function calculateWalletBalance({
  wallet,
  chains,
  balances,
  currency,
  prices,
}: {
  wallet: Wallet | null;
  chains: Record<ChainId, Chain>;
  balances: Balance[];
  currency: CurrencyItem | null;
  prices: PriceObject | null;
}) {
  if (nullable(currency?.coingeckoId) || nullable(wallet) || nullable(prices) || balances.length === 0) {
    return new BigNumber(0);
  }

  const isPolkadotVault = walletUtils.isPolkadotVault(wallet);

  const accountMap = dictionary(wallet.accounts, 'accountId');

  return balances.reduce((acc, balance) => {
    const account = accountMap[balance.accountId];
    const chain = chains[balance.chainId];
    if (nullable(account) || nullable(chain)) return acc;
    if (accountUtils.isVaultBaseAccount(account) && isPolkadotVault) return acc;

    const asset = chain.assets.find((asset) => asset.assetId === balance.assetId);
    if (nullable(asset?.priceId)) return acc;
    const pricesMap = prices[asset.priceId];
    if (nullable(pricesMap)) return acc;
    const price = pricesMap[currency.coingeckoId];
    if (nullable(price)) return acc;

    const fiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);

    return acc.plus(new BigNumber(fiatBalance));
  }, new BigNumber(0));
}
