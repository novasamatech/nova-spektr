import BigNumber from 'bignumber.js';
import { concat, orderBy, sortBy } from 'lodash';

import tokensProd from '@shared/config/tokens/tokens.json';
import tokensDev from '@shared/config/tokens/tokens_dev.json';
import { sumValues } from '@shared/api/network/service/chainsService';
import type { Account, AccountId, Balance, ChainId, AssetByChains, AssetBalance } from '@shared/core';
import { getBalanceBn, totalAmount, ZERO_BALANCE } from '@shared/lib/utils';
import { isKusama, isNameStartsWithNumber, isPolkadot } from '@shared/api/network/lib/utils';
import { PriceObject } from '@shared/api/price-provider';
import { balanceUtils } from '@entities/balance';
import { accountUtils } from '@entities/wallet';
import { AssetByChainsWithFiatBalance, AssetChain } from './types';

const TOKENS: Record<string, any> = {
  tokens: tokensProd,
  'tokens-dev': tokensDev,
};

export const tokensService = {
  getTokensData,
  getChainWithBalance,
  sumTokenBalances,
  sortTokensByBalance,
};

function getTokensData(): AssetByChains[] {
  return TOKENS[process.env.TOKENS_FILE || 'tokens'];
}

function sumTokenBalances(firstBalance: AssetBalance, secondBalance?: AssetBalance | null): AssetBalance {
  if (!secondBalance) return firstBalance;

  return {
    verified: firstBalance.verified && secondBalance.verified,
    free: sumValues(firstBalance.free, secondBalance.free),
    reserved: sumValues(firstBalance.reserved, secondBalance.reserved),
    frozen: sumValues(firstBalance.frozen, secondBalance.frozen),
    locked: (firstBalance.locked || []).concat(secondBalance.locked || []),
  };
}

function getSelectedAccountIds(accounts: Account[], chainId: ChainId): AccountId[] {
  return accounts.reduce<AccountId[]>((acc, account) => {
    if (accountUtils.isChainIdMatch(account, chainId)) {
      acc.push(account.accountId);
    }

    return acc;
  }, []);
}

function getChainWithBalance(
  balances: Balance[],
  chains: AssetChain[],
  hideZeroBalances: boolean,
  accounts: Account[],
): [AssetChain[], AssetBalance] {
  let totalBalance = {} as AssetBalance;

  const chainsWithBalance = chains.reduce<AssetChain[]>((acc, chain) => {
    const selectedAccountIds = getSelectedAccountIds(accounts, chain.chainId);

    const accountsBalance = balanceUtils.getAssetBalances(
      balances,
      selectedAccountIds,
      chain.chainId,
      chain.assetId.toString(),
    );

    const assetBalance = accountsBalance.reduce<AssetBalance>((acc, balance) => {
      return sumTokenBalances(balance, acc);
    }, {});

    totalBalance = sumTokenBalances(assetBalance, totalBalance);

    if (!hideZeroBalances || assetBalance.verified === false || totalAmount(assetBalance) !== ZERO_BALANCE) {
      acc.push({ ...chain, balance: assetBalance });
    }

    return acc;
  }, [] as AssetChain[]);

  return [chainsWithBalance, totalBalance];
}

function sortTokensByBalance(
  tokens: AssetByChains[],
  assetsPrices: PriceObject | null,
  currency?: string,
): AssetByChains[] {
  const tokensWithFiatBalance = [] as AssetByChainsWithFiatBalance[];

  const relaychains = { withBalance: [], noBalance: [] };
  const parachains = { withBalance: [], noBalance: [] };
  const numberchains = { withBalance: [], noBalance: [] };
  const testnets = { withBalance: [], noBalance: [] };

  tokens.forEach((token) => {
    const tokenTotal = totalAmount(token.totalBalance);
    const tokenBalance = getBalanceBn(tokenTotal, token.precision);
    const tokenAssetPrice = token.priceId && currency && assetsPrices?.[token.priceId]?.[currency]?.price;
    const fiatBalance = new BigNumber(tokenAssetPrice || 0).multipliedBy(tokenBalance);

    const hasBalance = tokenTotal !== ZERO_BALANCE;
    let collection: AssetByChains[] = [];

    token.chains.sort((a, b) => chainBalanceSorter(a, b, assetsPrices, token, currency));

    if ((isPolkadot(token.name) || isKusama(token.name)) && !token.isTestToken) {
      collection = hasBalance ? relaychains.withBalance : relaychains.noBalance;
      collection.push(token);

      return;
    }

    if (fiatBalance.gt(0) && !token.isTestToken) {
      tokensWithFiatBalance.push({ ...token, fiatBalance: fiatBalance.toString() });

      return;
    }

    if (token.isTestToken) {
      collection = hasBalance ? testnets.withBalance : testnets.noBalance;
    } else if (isNameStartsWithNumber(token.name)) {
      collection = hasBalance ? numberchains.withBalance : numberchains.noBalance;
    } else {
      collection = hasBalance ? parachains.withBalance : parachains.noBalance;
    }

    collection.push(token);
  });

  return concat(
    orderBy(relaychains.withBalance, 'name', ['desc']),
    orderBy(relaychains.noBalance, 'name', ['desc']),
    tokensWithFiatBalance.sort((a, b) => (new BigNumber(b.fiatBalance).lt(new BigNumber(a.fiatBalance)) ? -1 : 1)),
    sortBy(parachains.withBalance, 'name'),
    sortBy(parachains.noBalance, 'name'),
    sortBy(numberchains.withBalance, 'name'),
    sortBy(numberchains.noBalance, 'name'),
    sortBy(testnets.withBalance, 'name'),
    sortBy(testnets.noBalance, 'name'),
  );
}

const isPolkadotOrKusama = (name: string): boolean => {
  return isPolkadot(name) || isKusama(name);
};

function chainBalanceSorter(
  first: AssetChain,
  second: AssetChain,
  assetsPrices: PriceObject | null,
  asset: AssetByChains,
  currency?: string,
) {
  const isFirstPolkadotOrKusama = isPolkadotOrKusama(first.name);
  const isSecondPolkadotOrKusama = isPolkadotOrKusama(second.name);

  if (isFirstPolkadotOrKusama && !isSecondPolkadotOrKusama) return -1;
  if (!isFirstPolkadotOrKusama && isSecondPolkadotOrKusama) return 1;

  const firstTotal = totalAmount(first.balance);
  const secondTotal = totalAmount(second.balance);

  const firstBalance = getBalanceBn(firstTotal, asset.precision);
  const secondBalance = getBalanceBn(secondTotal, asset.precision);

  const firstAssetPrice = asset.priceId && currency && assetsPrices?.[asset.priceId]?.[currency]?.price;
  const secondAssetPrice = asset.priceId && currency && assetsPrices?.[asset.priceId]?.[currency]?.price;

  const firstFiatBalance = new BigNumber(firstAssetPrice || 0).multipliedBy(firstBalance);
  const secondFiatBalance = new BigNumber(secondAssetPrice || 0).multipliedBy(secondBalance);

  if (firstFiatBalance.gt(secondFiatBalance)) return -1;
  if (firstFiatBalance.lt(secondFiatBalance)) return 1;

  if (firstBalance.gt(secondBalance)) return -1;
  if (firstBalance.lt(secondBalance)) return 1;

  return first.name.localeCompare(second.name);
}
