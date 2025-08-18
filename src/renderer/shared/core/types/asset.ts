import { type BN } from '@polkadot/util';
import { type z } from 'zod';

import { type Balance } from './balance';
import { type ChainId } from './general';

export type AssetId = number & z.$brand<'AssetId'>;

export type Asset = {
  name: string;
  assetId: AssetId;
  symbol: string;
  staking?: StakingType;
  precision: number;
  priceId?: string;
  icon: {
    monochrome: string;
    colored: string;
  };
  type: AssetType;
  typeExtras?: StatemineExtras | OrmlExtras;
};

export const enum StakingType {
  RELAYCHAIN = 'relaychain',
  // PARACHAIN = 'parachain',
}

export const enum AssetType {
  NATIVE = 'native',
  ORML = 'orml',
  STATEMINE = 'statemine',
}

export type StatemineExtras = {
  assetId: string;
  palletName?: string;
};

export type OrmlExtras = {
  currencyIdScale: string;
  currencyIdType: string;
  existentialDeposit: string;
  transfersEnabled?: boolean;
};

// TODO move into portfolio feature
export type PortfolioTokenBalance = {
  total: BN;
  transferable: BN;
  locked: BN;
  frozen: BN;
  balances: Balance[];
};

// TODO move into portfolio feature
export type AssetByChains = {
  name: string;
  precision: number;
  icon: {
    monochrome: string;
    colored: string;
  };
  symbol: string;
  isTestToken?: boolean;
  priceId?: string;
  chains: {
    chainId: ChainId;
    name: string;
    assetId: AssetId;
    assetSymbol: string;
    balance: PortfolioTokenBalance | null;
    type?: AssetType;
    typeExtras?: StatemineExtras | OrmlExtras;
  }[];
};
