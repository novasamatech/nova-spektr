import { type AssetBalance } from './balance';
import { type ChainId } from './general';

export type Asset = {
  name: string;
  assetId: number;
  symbol: string;
  staking?: StakingType;
  precision: number;
  priceId?: string;
  icon: string;
  type?: AssetType;
  typeExtras?: StatemineExtras | OrmlExtras;
};

export const enum StakingType {
  RELAYCHAIN = 'relaychain',
  // PARACHAIN = 'parachain',
}

export const enum AssetType {
  ORML = 'orml',
  STATEMINE = 'statemine',
}

export type StatemineExtras = {
  assetId: string;
};

export type OrmlExtras = {
  currencyIdScale: string;
  currencyIdType: string;
  existentialDeposit: string;
  transfersEnabled?: boolean;
};

export type AssetByChains = {
  name: string;
  precision: number;
  icon: string;
  symbol: string;
  isTestToken?: boolean;
  priceId?: string;
  totalBalance?: AssetBalance;
  chains: {
    chainId: ChainId;
    name: string;
    assetId: number;
    assetSymbol: string;
    balance?: AssetBalance;
    type?: AssetType;
    typeExtras?: StatemineExtras | OrmlExtras;
  }[];
};
