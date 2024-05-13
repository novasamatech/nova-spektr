import tokensProd from '@shared/config/tokens/tokens.json';
import tokensDev from '@shared/config/tokens/tokens_dev.json';
import { sumValues } from '@shared/api/network/service/chainsService';
import type { Account, AccountId, Balance, ChainId, TokenAsset, TokenBalance } from '@shared/core';
import { ZERO_BALANCE, totalAmount } from '@shared/lib/utils';
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

// TODO change to prod and dev files
function getTokensData(): TokenAsset[] {
  // const tokens = TOKENS[process.env.TOKENS_FILE || 'tokens'];
  const tokens = TOKENS['tokens-dev'];

  return tokens;
}

function sumTokenBalances(firstBalance: TokenBalance, secondBalance?: TokenBalance | null): TokenBalance {
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
): [AssetChain[], TokenBalance] {
  let totalBalance = {} as TokenBalance;

  const chainsWithBalance = chains.reduce((acc, chain) => {
    const selectedAccountIds = getSelectedAccountIds(accounts, chain.chainId);

    const accountsBalance = balanceUtils.getAssetBalances(
      balances,
      selectedAccountIds,
      chain.chainId,
      chain.assetId.toString(),
    );

    const assetBalance = accountsBalance.reduce<TokenBalance>((acc, balance) => {
      return sumTokenBalances(balance, acc);
    }, {} as Balance);

    totalBalance = sumTokenBalances(assetBalance, totalBalance);

    if (!hideZeroBalances || assetBalance.verified === false || totalAmount(assetBalance) !== ZERO_BALANCE) {
      acc.push({ ...chain, balance: assetBalance });
    }

    return acc;
  }, [] as AssetChain[]);

  return [chainsWithBalance, totalBalance];
}
