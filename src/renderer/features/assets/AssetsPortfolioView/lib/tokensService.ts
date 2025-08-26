import { BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { concat, orderBy, sortBy } from 'lodash';

import { isKusama, isNameStartsWithNumber, isPolkadot } from '@/shared/api/network/lib/utils';
import { sumValues } from '@/shared/api/network/service/chainsService';
import { type PriceObject } from '@/shared/api/price-provider';
import {
  type AssetByChains,
  type Balance,
  type BalanceMap,
  type ChainId,
  type PortfolioTokenBalance,
} from '@/shared/core';
import {
  TOKENS_CONFIG_URL,
  getBalanceBn,
  nonNullable,
  nullable,
  totalAmountBN,
  transferableAmountBN,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { accountUtils } from '@/entities/wallet';

import { type AssetByChainsWithBalance, type AssetByChainsWithFiatBalance, type AssetChain } from './types';

export const tokensService = {
  getTokensData,
  getChainWithBalance,
  sumTokenBalances,
  sortTokensByBalance,
  hideZeroBalances,
  calculateTotalBalance,
};

async function getTokensData(): Promise<AssetByChains[] | null> {
  const response = await fetch(TOKENS_CONFIG_URL);

  if (!response.ok) {
    console.error(`Failed to fetch tokens config: ${response.status} ${response.statusText}`);
    return null;
  }

  return response.json();
}

function getTokenBalance(balance: Balance): PortfolioTokenBalance {
  return {
    total: totalAmountBN(balance),
    transferable: transferableAmountBN(balance),
    locked: balance.frozen,
    frozen: balance.reserved,
    balances: [balance],
  };
}

function sumTokenBalanceWithBalance(tokenBalance: PortfolioTokenBalance, balance: Balance): PortfolioTokenBalance {
  return sumTokenBalances(tokenBalance, getTokenBalance(balance));
}

function sumTokenBalances(a: PortfolioTokenBalance, b: PortfolioTokenBalance): PortfolioTokenBalance {
  return {
    total: sumValues(a.total, b.total),
    transferable: sumValues(a.transferable, b.transferable),
    locked: sumValues(a.locked, b.locked),
    frozen: sumValues(a.frozen, b.frozen),
    balances: a.balances.concat(b.balances),
  };
}

function getSelectedAccountIds(accounts: AnyAccount[], chainId: ChainId): AccountId[] {
  return accounts.reduce<AccountId[]>((acc, account) => {
    if (accountUtils.isChainIdMatch(account, chainId)) {
      acc.push(account.accountId);
    }

    return acc;
  }, []);
}

function getChainWithBalance(balances: BalanceMap, chains: AssetChain[], accounts: AnyAccount[]): AssetChain[] {
  const initialBalance: PortfolioTokenBalance = {
    total: BN_ZERO,
    transferable: BN_ZERO,
    locked: BN_ZERO,
    frozen: BN_ZERO,
    balances: [],
  };

  return chains.reduce<AssetChain[]>((acc, chain) => {
    const selectedAccountIds = getSelectedAccountIds(accounts, chain.chainId);

    const accountsBalance = balanceUtils.getAssetBalances(balances, selectedAccountIds, chain.chainId, chain.assetId);
    const assetBalance =
      accountsBalance.length > 0 ? accountsBalance.reduce(sumTokenBalanceWithBalance, initialBalance) : null;

    acc.push({ ...chain, balance: assetBalance });

    return acc;
  }, []);
}

function calculateTotalBalance(assets: AssetChain[]) {
  let totalBalance: PortfolioTokenBalance = {
    total: BN_ZERO,
    transferable: BN_ZERO,
    locked: BN_ZERO,
    frozen: BN_ZERO,
    balances: [],
  };

  let hasBalances = false;

  for (const { balance } of assets) {
    if (nonNullable(balance)) {
      hasBalances = true;
      totalBalance = sumTokenBalances(totalBalance, balance);
    }
  }

  return hasBalances ? totalBalance : null;
}

function hideZeroBalances(hideZeroBalance: boolean, activeTokensWithBalance: AssetByChains[]): AssetByChains[] {
  if (!hideZeroBalance) {
    return activeTokensWithBalance;
  }

  const result: AssetByChains[] = [];

  for (const token of activeTokensWithBalance) {
    const totalBalance = calculateTotalBalance(token.chains);
    if (nonNullable(totalBalance) && totalBalance.total.isZero()) continue;

    const filteredChains = token.chains.filter((chain) => {
      return nullable(chain.balance) || !chain.balance.total.isZero();
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
    const totalBalance = calculateTotalBalance(token.chains);
    const tokenTotal = totalBalance?.total ?? BN_ZERO;
    const tokenBalance = getBalanceBn(tokenTotal.toString(), token.precision);
    const tokenAssetPrice = token.priceId && currency && assetsPrices?.[token.priceId]?.[currency]?.price;
    const fiatBalance = new BigNumber(tokenAssetPrice || 0).multipliedBy(tokenBalance);

    const hasBalance = !tokenTotal.isZero();
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

  const firstBalance = first.balance?.total ?? BN_ZERO;
  const secondBalance = second.balance?.total ?? BN_ZERO;

  const firstAssetPrice = asset.priceId && currency && assetsPrices?.[asset.priceId]?.[currency]?.price;
  const secondAssetPrice = asset.priceId && currency && assetsPrices?.[asset.priceId]?.[currency]?.price;

  const firstFiatBalance = new BigNumber(firstAssetPrice || 0).multipliedBy(firstBalance.toString());
  const secondFiatBalance = new BigNumber(secondAssetPrice || 0).multipliedBy(secondBalance.toString());

  if (firstFiatBalance.gt(secondFiatBalance)) return -1;
  if (firstFiatBalance.lt(secondFiatBalance)) return 1;

  if (firstBalance.gt(secondBalance)) return -1;
  if (firstBalance.lt(secondBalance)) return 1;

  return first.name.localeCompare(second.name);
}
