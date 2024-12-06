import { default as BigNumber } from 'bignumber.js';
import { concat, orderBy, sortBy } from 'lodash';

import { isKusama, isNameStartsWithNumber, isPolkadot } from '@/shared/api/network/lib/utils';
import { sumValues } from '@/shared/api/network/service/chainsService';
import { type PriceObject } from '@/shared/api/price-provider';
import tokensProd from '@/shared/config/tokens/tokens.json';
import tokensDev from '@/shared/config/tokens/tokens_dev.json';
import {
  type Account,
  type AccountId,
  type AssetBalance,
  type AssetByChains,
  type Balance,
  type ChainId,
} from '@/shared/core';
import { ZERO_BALANCE, getBalanceBn, nonNullable, totalAmount, totalAmountBN } from '@/shared/lib/utils';
import { balanceUtils } from '@/entities/balance';
import { accountUtils } from '@/entities/wallet';

import { type AssetByChainsWithBalance, type AssetByChainsWithFiatBalance, type AssetChain } from './types';

const TOKENS: Record<string, any> = {
  tokens: tokensProd,
  'tokens-dev': tokensDev,
};

export const tokensService = {
  getTokensData,
  getChainWithBalance,
  sumTokenBalances,
  sortTokensByBalance,
  hideZeroBalances,
  calculateTotalBalance,
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

function getChainWithBalance(balances: Balance[], chains: AssetChain[], accounts: Account[]): AssetChain[] {
  return chains.reduce<AssetChain[]>((acc, chain) => {
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

    if (assetBalance.verified !== false) {
      acc.push({ ...chain, balance: assetBalance });
    }

    return acc;
  }, [] as AssetChain[]);
}

function calculateTotalBalance(assets: AssetChain[]) {
  let totalBalance: AssetBalance = {};

  for (const { balance } of assets) {
    totalBalance = sumTokenBalances(totalBalance, balance);
  }

  return totalBalance;
}

function hideZeroBalances(hideZeroBalance: boolean, activeTokensWithBalance: AssetByChains[]): AssetByChains[] {
  if (!hideZeroBalance) {
    return activeTokensWithBalance;
  }

  const result: AssetByChains[] = [];

  for (const token of activeTokensWithBalance) {
    if (totalAmountBN(calculateTotalBalance(token.chains)).isZero()) continue;

    const filteredChains = token.chains.filter((chain) => {
      return nonNullable(chain.balance) && !totalAmountBN(chain.balance).isZero();
    });

    result.push({ ...token, chains: filteredChains });
  }

  return result;
}

function sortTokensByBalance(
  tokens: AssetByChains[],
  assetsPrices: PriceObject | null,
  currency?: string,
): AssetByChains[] {
  const tokensWithFiatBalance: AssetByChainsWithFiatBalance[] = [];
  const relaychains = { withBalance: [], noBalance: [] };
  const parachains = { withBalance: [] as AssetByChainsWithBalance[], noBalance: [] };
  const numberchains = { withBalance: [], noBalance: [] };
  const testnets = { withBalance: [], noBalance: [] };

  for (const token of tokens) {
    const tokenTotal = totalAmount(calculateTotalBalance(token.chains));
    const tokenBalance = getBalanceBn(tokenTotal, token.precision);
    const tokenAssetPrice = token.priceId && currency && assetsPrices?.[token.priceId]?.[currency]?.price;
    const fiatBalance = new BigNumber(tokenAssetPrice || 0).multipliedBy(tokenBalance);

    const hasBalance = tokenTotal !== ZERO_BALANCE;
    let collection: AssetByChainsWithBalance[] = [];

    token.chains.sort((a, b) => chainBalanceSorter(a, b, assetsPrices, token, currency));

    if ((isPolkadot(token.name) || isKusama(token.name)) && !token.isTestToken) {
      collection = hasBalance ? relaychains.withBalance : relaychains.noBalance;
      collection.push(token);

      continue;
    }

    if (fiatBalance.gt(0) && !token.isTestToken) {
      tokensWithFiatBalance.push({ ...token, fiatBalance: fiatBalance.toString() });

      continue;
    }

    if (token.isTestToken) {
      collection = hasBalance ? testnets.withBalance : testnets.noBalance;
    } else if (isNameStartsWithNumber(token.name)) {
      collection = hasBalance ? numberchains.withBalance : numberchains.noBalance;
    } else {
      collection = hasBalance ? parachains.withBalance : parachains.noBalance;
    }

    collection.push({ ...token, tokenBalance });
  }

  return concat<AssetByChainsWithBalance>(
    orderBy(relaychains.withBalance, 'name', ['desc']),
    orderBy(relaychains.noBalance, 'name', ['desc']),
    tokensWithFiatBalance.sort((a, b) => (new BigNumber(b.fiatBalance).lt(new BigNumber(a.fiatBalance)) ? -1 : 1)),
    parachains.withBalance.sort((a, b) => (b.tokenBalance!.lt(a.tokenBalance!) ? -1 : 1)),
    sortBy(parachains.noBalance, 'symbol'),
    sortBy(numberchains.withBalance, 'symbol'),
    sortBy(numberchains.noBalance, 'symbol'),
    sortBy(testnets.withBalance, 'symbol'),
    sortBy(testnets.noBalance, 'symbol'),
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
