import { type default as BigNumber } from 'bignumber.js';

import { type AssetByChains, type AssetId, type ChainId, type PortfolioTokenBalance } from '@/shared/core';

export type AssetChain = {
  chainId: ChainId;
  name: string;
  assetId: AssetId;
  assetSymbol: string;
  balance: PortfolioTokenBalance | null;
};

export type AssetByChainsWithFiatBalance = AssetByChains & { fiatBalance: string };

export type AssetByChainsWithBalance = AssetByChains & { tokenBalance?: BigNumber; fiatBalance?: string };
