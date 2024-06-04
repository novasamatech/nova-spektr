import BigNumber from 'bignumber.js';

import { AssetBalance, AssetByChains, ChainId } from '@shared/core';

export type AssetChain = {
  chainId: ChainId;
  name: string;
  assetId: number;
  assetSymbol: string;
  balance?: AssetBalance;
};

export type AssetByChainsWithFiatBalance = AssetByChains & { fiatBalance: string };

export type AssetByChainsWithBalance = AssetByChains & { tokenBalance?: BigNumber; fiatBalance?: string };
