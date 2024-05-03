import tokensProd from '@shared/config/tokens/tokens.json';
import tokensDev from '@shared/config/tokens/tokens_dev.json';
import type { TokenAsset } from '@shared/core';

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
