import tokensProd from '@shared/config/tokens/tokens.json';
import tokensDev from '@shared/config/tokens/tokens_dev.json';
import { sumValues } from '@shared/api/network/service/chainsService';
import type { TokenAsset, TokenBalance } from '@shared/core';

const TOKENS: Record<string, any> = {
  tokens: tokensProd,
  'tokens-dev': tokensDev,
};

export const tokensService = {
  getTokensData,
};

// TODO change to prod and dev files
function getTokensData(): TokenAsset[] {
  // const tokens = TOKENS[process.env.TOKENS_FILE || 'tokens'];
  const tokens = TOKENS['tokens-dev'];

  return tokens;
}

export const sumTokenBalances = (firstBalance: TokenBalance, secondBalance?: TokenBalance | null): TokenBalance => {
  if (!secondBalance) return firstBalance;

  return {
    verified: firstBalance.verified && secondBalance.verified,
    free: sumValues(firstBalance.free, secondBalance.free),
    reserved: sumValues(firstBalance.reserved, secondBalance.reserved),
    frozen: sumValues(firstBalance.frozen, secondBalance.frozen),
    locked: (firstBalance.locked || []).concat(secondBalance.locked || []),
  };
};
