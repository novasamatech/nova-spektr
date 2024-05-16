import tokensProd from '@shared/config/tokens/tokens.json';
import tokensDev from '@shared/config/tokens/tokens_dev.json';
import { sumValues } from '@shared/api/network/service/chainsService';
import type { Account, AccountId, Balance, ChainId, AssetByChains, AssetBalance } from '@shared/core';
import { totalAmount, ZERO_BALANCE } from '@shared/lib/utils';
import { balanceUtils } from '@entities/balance';
import { accountUtils } from '@entities/wallet';
import { AssetChain } from './types';

const TOKENS: Record<string, any> = {
  tokens: tokensProd,
  'tokens-dev': tokensDev,
};

export const tokensService = {
  getTokensData,
  getChainWithBalance,
  sumTokenBalances,
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
