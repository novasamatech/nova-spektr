import { BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { concat } from 'lodash';

import { isKusama, isNameStartsWithNumber, isPolkadot } from '@/shared/api/network/lib/utils';
import { sumValues } from '@/shared/api/network/service/chainsService';
import { type PriceObject } from '@/shared/api/price-provider';
import {
  type AssetByChains,
  type Balance,
  type BalanceMap,
  type Chain,
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
import { type AnyAccount, accountService } from '@/domains/network';
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

function getSelectedAccountIds(accounts: AnyAccount[], chain: Chain): AccountId[] {
  return accounts.reduce<AccountId[]>((acc, account) => {
    if (!accountService.isAccountAvailableOnChain(account, chain)) {
      return acc;
    }
    if (accountUtils.isFlexibleMultisigAccount(account)) {
      return acc;
    }
    acc.push(account.accountId);
    return acc;
  }, []);
}

function getChainWithBalance(
  balances: BalanceMap,
  assetChains: AssetChain[],
  accounts: AnyAccount[],
  chains: Record<ChainId, Chain>,
): AssetChain[] {
  const initialBalance: PortfolioTokenBalance = {
    total: BN_ZERO,
    transferable: BN_ZERO,
    locked: BN_ZERO,
    frozen: BN_ZERO,
    balances: [],
  };

  return assetChains.reduce<AssetChain[]>((acc, assetChain) => {
    const chain = chains[assetChain.chainId];
    if (nullable(chain)) return acc;

    const selectedAccountIds = getSelectedAccountIds(accounts, chain);

    const accountsBalance = balanceUtils.getAssetBalances(
      balances,
      selectedAccountIds,
      assetChain.chainId,
      assetChain.assetId,
    );
    const assetBalance =
      accountsBalance.length > 0 ? accountsBalance.reduce(sumTokenBalanceWithBalance, initialBalance) : null;

    acc.push({ ...assetChain, balance: assetBalance });

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

/**
 * Sorts tokens by balance with the following priority hierarchy:
 *
 * 1. Tokens with fiat balance (highest fiat value first)
 * 2. Relay chains (Polkadot/Kusama) with balance
 * 3. Relay chains without balance
 * 4. Parachains with balance
 * 5. Parachains without balance
 * 6. Number-named chains with balance
 * 7. Number-named chains without balance
 * 8. Test networks with balance
 * 9. Test networks without balance
 */
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

    token.chains.sort((a, b) => compareChainsByFiatAndBalance(a, b, assetsPrices, token, currency));

    if (fiatBalance.gt(0) && !token.isTestToken) {
      tokensWithFiatBalance.push({ ...token, fiatBalance: fiatBalance.toString() });

      continue;
    }

    if ((isPolkadot(token.name) || isKusama(token.name)) && !token.isTestToken) {
      collection = hasBalance ? relaychains.withBalance : relaychains.noBalance;
      collection.push(token);

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
    tokensWithFiatBalance.sort((a, b) => (new BigNumber(b.fiatBalance).lt(new BigNumber(a.fiatBalance)) ? -1 : 1)),
    relaychains.withBalance.sort(compareTokensByUtilityAndBalance),
    relaychains.noBalance.sort(compareTokensByUtilityAndBalance),
    parachains.withBalance.sort(compareTokensByUtilityAndBalance),
    parachains.noBalance.sort(compareTokensByUtilityAndBalance),
    numberchains.withBalance.sort(compareTokensByUtilityAndBalance),
    numberchains.noBalance.sort(compareTokensByUtilityAndBalance),
    testnets.withBalance.sort(compareTokensByUtilityAndBalance),
    testnets.noBalance.sort(compareTokensByUtilityAndBalance),
  );
}

const isPolkadotOrKusama = (name: string): boolean => {
  return isPolkadot(name) || isKusama(name);
};

const isUtilityToken = (token: AssetByChains): boolean => {
  return token.chains.some((chain) => chain.assetId === 0);
};

/**
 * Sorts tokens within the same category using priority rules:
 *
 * 1. Relay chains (Polkadot/Kusama) come first
 * 2. Utility tokens (assetId === 0) come before other tokens
 * 3. Tokens with higher balance come before tokens with lower balance
 * 4. Alphabetical order by symbol as final tiebreaker
 */
function compareTokensByUtilityAndBalance(first: AssetByChainsWithBalance, second: AssetByChainsWithBalance) {
  const isFirstPolkadotOrKusama = isPolkadotOrKusama(first.name);
  const isSecondPolkadotOrKusama = isPolkadotOrKusama(second.name);

  if (isFirstPolkadotOrKusama && !isSecondPolkadotOrKusama) return -1;
  if (!isFirstPolkadotOrKusama && isSecondPolkadotOrKusama) return 1;

  const isFirstUtility = isUtilityToken(first);
  const isSecondUtility = isUtilityToken(second);

  if (isFirstUtility && !isSecondUtility) return -1;
  if (!isFirstUtility && isSecondUtility) return 1;

  if (first.tokenBalance && second.tokenBalance) {
    if (first.tokenBalance.gt(second.tokenBalance)) return -1;
    if (first.tokenBalance.lt(second.tokenBalance)) return 1;
  }

  return first.symbol.localeCompare(second.symbol);
}

/**
 * Sorts chains within a token by the following criteria:
 *
 * 1. Relay chains (Polkadot/Kusama) appear first
 * 2. Chains with higher fiat balance come before chains with lower fiat balance
 * 3. Chains with higher token balance come before chains with lower token balance
 * 4. Alphabetical order as final tiebreaker
 */
function compareChainsByFiatAndBalance(
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
